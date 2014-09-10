import sys
thismodule = sys.modules[__name__]

import json
import tutum
import requests
from bunch import Bunch

class A(object):
	pass

def func(self):
	import time
	from firebase import firebase

	a = A()

	start = int(round(time.time() * 1000))
	def logms(step):
		end = int(round(time.time() * 1000))
		self.info(self.rid, "firebase_get_data_external: %s (%s)" % (str(end-start), str(step)))
	logms(1)
	
	authentication = firebase.FirebaseAuthentication(self.settings.FIREBASE_SECRET, 'philip@sahli.net', extra={'id': 'philipsahli'})
	app = firebase.FirebaseApplication(self.settings.FIREBASE, authentication)
	logms(2)
	
	firebase_uid = self.GET.get('user_id')
	tutum.user = self.settings.TUTUM_USER
	tutum.apikey = self.settings.TUTUM_APIKEY
	logms(3)
	
	debug = self.debug
	info = self.info
	rid = self.rid

	lcache = {}
	
	class TutumService(object):
		
		def __init__(self, settings):
			self.settings = settings
		
		def _custom_link_data(self, data):
			
			for app in data:
				new_linked = []
				link_names = []
				for link in app['linked']:
					for link_key, link_value in link.iteritems():
						if link_key == "to_application":
							status, text = self._call(link_value, "GET", get_cached=True)
							link_value = "AAA"
							
							new_linked.append({
								'name': link['name'],
								'to_application': json.loads(text)['unique_name']
							})
							link_names.append(json.loads(text)['name'])
				app['linked'] = new_linked
				app['link_names'] = link_names
			return data
		
		def _custom_variables(self, data):
			import re
			data_cleaned = []
			try:
				for variable in data:
					name = re.search("(.*?)_[0-9]+(.*)", variable['key'])
						
					if name is None: 
						data_cleaned.append(variable)
			except Exception, e:
				raise e
			return data, data_cleaned

		
		def get_data(self, name=None):
			tutum.user = self.settings.TUTUM_USER
			tutum.apikey = self.settings.TUTUM_APIKEY

			ids = []

			#apps = tutum.Cluster.list()
			status_code, apps = self._call("/api/v1/application/", "GET")
			#info(rid, status_code)
			apps = Bunch(json.loads(apps))
			if apps:
				#info(rid, len(apps))
				#info(rid, apps)
				for app in apps.objects:

					app = Bunch(app)
					if app.state == "Terminated": continue

					status_code, details_api = self._call("/api/v1/application/"+app.uuid+"/", "GET")
					details = Bunch(json.loads(details_api))

					all_env_vars, custom_env_vars = self._custom_variables(details.container_envvars)
					app_dict = {'name': app.name, 
								'id': app.uuid,
								'uri': app.resource_uri,
								'all_env_vars': all_env_vars,
								'custom_env_vars': custom_env_vars,
								'state': app.state,
								'web_public_dns': app.web_public_dns,
								
								# links
								'linked': details.linked_to_application,
								'link_variables': details.link_variables,
								
								# debug
								'details': details.__dict__,
								#'full': app.__dict__
								}

						
					# workout to get vars without linked_vars from environment variables
					status, text = self._call("/api/v1/application/"+app.uuid+"/", "GET", get_cached=True)
					app_dict['env_vars'] = json.loads(text)['container_envvars']
					
					conts = []
					status_code, containers = self._call("/api/v1/application/"+app.uuid+"/", "GET", get_cached=True)
					containers = Bunch(json.loads(containers))

					#for container in containers:
						#info(rid, container)
						#container = Bunch(json.loads(container))
						#ports = []
						#for port in container.container_ports:
						#	ports.append({'inner': port['inner_port'], 'outer': port['outer_port']})
						#conts.append({'name': container.name, 
						#				'id': container.uuid, 
						#			  'dns': container.public_dns,
						#			  'ports': ports,
						#			  })
					app_dict.update({'containers': conts})
					app_dict.update({'image': containers.image_name})
					#app_dict.update({'size': container_size})
					ids.append(app_dict)
				# change linked.to_application to app name
				ids = self._custom_link_data(ids)
				
			return ids
		
		def _call(self, uri, method, data=None, get_cached=False):
			if method == "GET" and get_cached:
				#debug(rid, "get from cache")
				cached = lcache.get(uri, None)
				if cached is not None:
					debug(rid, "found in cached")
					return cached[0], cached[1]
			
			start = int(round(time.time() * 1000))
			base_url = "https://app.tutum.co"
			headers = {
				'Authorization': "ApiKey %s:%s" % (self.settings.TUTUM_USER, self.settings.TUTUM_APIKEY)
			}
			if data:
				headers.update({'Content-Type': 'application/json', 'Accept': 'application/json'})
			if method == "POST":
				data=json.dumps(data)
				r = requests.post(base_url+uri, headers=headers, data=data)	
			elif method == "GET":
				r = requests.get(base_url+uri, headers=headers)
			elif method == "DELETE":
				r = requests.delete(base_url+uri, headers=headers)
				
			end = int(round(time.time() * 1000))
			debug(rid, (str(end-start), "_call", uri, method, r.status_code))
			if method == "GET" and get_cached:
				if not cached:
					#debug(rid, "put to cache")
					lcache.update({uri: [r.status_code, r.text]})
			return r.status_code, r.text
		
		def _change_state(self, service, uuid, operation, state):
			# initiate state change	
			if operation == "delete":
				r = self._call("/api/v1/application/%s/" % uuid, "DELETE")
			else:
				r = self._call("/api/v1/application/%s/%s/" % (uuid, operation), "POST")
			if r[0] not in [200, 201, 202]:
				raise Exception(r)
		
			# inner function for getting if target state arrived
			def check_state():
				code, text = self._call(service.uri, "GET")
				return (json.loads(text)['state'] == state)
			
			while True:
				running = check_state()
				if not running:
					time.sleep(0.5)
					next
				else:
					break
			
			return r
		
		def start(self, service):
			if service.state == "Stopped":
				result = self._change_state(service, service.id, "start", "Running")
			else:
				
				data = {
					"image": service.image,
					"name": service.name,
					"target_num_containers": 1,
					"container_envvars": service.custom_env_vars,
					"container_size": service.size,
					"linked_to_application": service.linked,
					"roles": service.roles
				}
				#info(rid, data)
				if service.web_public_dns and ".tutum.io" not in service.web_public_dns:
					data.update({'web_public_dns': service.web_public_dns})
				status, response = self._call("/api/v1/application/", "POST",
											  data)
				
				if status != 201:
					e = Exception(status, response)
					raise e

				# get new uid
				service.uri = json.loads(response)['resource_uri']
				service.id = json.loads(response)['uuid']
				info(rid, "service created with uri %s" % service.uri)
				
					
				uuid = json.loads(response)['uuid']
				result = self._change_state(service, uuid, "start", "Running")
				
			return result, service 
	
		def stop(self, service):
			result = self._change_state(service, service.id, "stop", "Stopped")
			if result[0] not in [202]:
				raise Exception(str(result))
			if service.terminate == 1:
				time.sleep(2)
				result = self._change_state(service, service.id, "delete", "Terminated")
				service.clear_state()
			return result, service

	
	class Firebase(object):
		
		service_url = "/users/%s/services/%s"
		services_url = "/users/%s/services/"
		services_url_new = "/users/%s/services/%s/"
		
		def __init__(self, user, settings):
			self.user = user
			self.settings = settings
			
			self._auth()
			
		def _auth(self):
			self.app = firebase.FirebaseApplication(self.settings.FIREBASE, authentication)
		
		def get_service(self, name):
			service_dict = self.app.get(self.service_url % (self.user, name), None)

			if not service_dict:
				raise Exception("service not found on firebase")
			return Service(**service_dict)
		
		def get_services(self):
			service_dict = self.app.get(self.services_url % self.user, None)

			if not service_dict:
				raise Exception("services not found on firebase")
			return service_dict
		
		def save_service(self, service):
			info(rid, service.data)
			data = self.app.put(self.services_url_new % (self.user, service.name), "data", service.data)
			return data
			
	
	def get_tutum_service():
		return TutumService(self.settings)
	
	class Service(object):
		
		def __init__(self, **kwargs):
			self.name = kwargs['data']['name']
			self.state = kwargs['data']['state']
			self.instance_count = 1
			self.id = kwargs['data'].get('id', None)
			self.image = kwargs['data']['image']
			self.env_vars = kwargs['data'].get('env_vars', [])
			self.custom_env_vars = kwargs['data'].get('custom_env_vars', [])
			self.web_public_dns = kwargs['data'].get('web_public_dns', None)
			self.uri = kwargs['data'].get('uri', "uri1")
			self.linked = kwargs['data'].get('linked', [])
			self.size = kwargs['data'].get('size', "XS")
			
			# full
			#self.full = kwargs['data']
			
			self.terminate = kwargs['terminate']
			if kwargs.has_key('role_config'):
				self.roles = ["global"]
			else:
				self.roles = []
			
			self.tutum_service = get_tutum_service()

		@property	
		def data(self):
			return {
				'name': self.name,
				'id': self.id,
				'uri': self.uri,
				'size': self.size,
				'image': self.image,
				'state': self.state,
				'web_public_dns': self.web_public_dns,
				'linked': self.linked,
				#'details': self.details,
				#'full': self.full,
				'custom_env_vars': self.custom_env_vars,
				'env_vars': self.env_vars,
				#'instances': []
			}
		
		def get_linked(self):
			linked = []
			for link in self.linked:
				linked.append({
					'name': link['name'],
					'to_application': json.loads(self.tutum_service._call("/api/v1/application/?name="+link['to_application']))['unique_name']
				})
			return linked
		
		def start(self):
			r = self.tutum_service.start(self)
			return r
			
		def stop(self):
			return self.tutum_service.stop(self)
		
		def clear_state(self, state="Terminated"):
			self.id = None
			self.state = state
			#self.full['state'] = state
			#self.full['instances'] = []
		
		def terminate(self):
			pass
		
		def save(self, to):
			to.save_service(self)
		
		def __str__(self):
			return self.__dict__
		
	

			
	# execute an action
	firebase = Firebase(firebase_uid, self.settings)
	
	logms(4)
	if self.POST.has_key('action'):
		service = firebase.get_service(self.POST['service_name'])
		action = self.POST['action']
		
		
		#return service
		if action == "start":
			result, service_new = service.start()
			if result[0] not in [200, 201, 202]:
				raise Exception(result)
			
			service_new.state = "Running"
			#service_new.full['state'] = service_new.state
			service_new.id = service_new.id
			info(rid, "id: "+service.id)
			info(rid, "save service with id "+service.id+" and uri "+service.uri+" to firebase")
			r = firebase.save_service(service_new)
			#info(rid, r)
			
			result = service_new.id
			
		elif action == "stop":
			result, service = service.stop()
			#service.full['state'] = service.state
			#service.full['instances'] = []
			service.id = None
			result = service.state
			firebase.save_service(service)
		else:
			result = False
	
	# sync
	else:
		#service = firebase.get_service(self.GET['name'])
		tutum_service = TutumService(self.settings)
		# get data from tutum

		tutum_data = tutum_service.get_data(name=None)
		tutum_names = [ a['name'] for a in tutum_data ]
		
		services = firebase.get_services()
		#debug(rid, services.keys())
		for service in services:
			#debug(rid, service)
			
			if service not in tutum_names:
				service_obj = firebase.get_service(service)
				service_obj.clear_state()
				firebase.save_service(service_obj)
				
		
		# put data to firebase for client
		if tutum_data is not None:
			for service_data in tutum_data:
				if not service_data['state'] == "Terminated":
					logms("save "+service_data['name'])
					app.put('/users/%s/services/%s/' % (firebase_uid, service_data['name']), "data", 
							{'name': service_data['name'],
							 'id': service_data['id'],
							 'uri': service_data.get('uri', "uri2"),
							 'size': service_data.get('size', "M"),
							 'image': service_data['image'],
							 'state': service_data['state'],
							 'web_public_dns': service_data['web_public_dns'],
							 'linked': service_data['linked'],
							 'details': service_data['details'],
							 #'full': service_data['full'],
							 'custom_env_vars': service_data['custom_env_vars'],
							 'env_vars': service_data['env_vars'],
							 'instances': service_data['containers']})
					logms("saved "+service_data['name'])
		result = tutum_names#, services_name
		
	lcache = {}
	return self.responses.JSONResponse(json.dumps(result))
