import sys
import re
thismodule = sys.modules[__name__]
from requests import HTTPError
import copy

import json
import requests
from bunch import Bunch

def func(self):
	import time
	from firebase import firebase

	start = int(round(time.time() * 1000))
	def logms(step):
		end = int(round(time.time() * 1000))
		self.info(self.rid, "firebase_get_data_external: %s (%s)" % (str(end-start), str(step)))
	logms(1)

	authentication = firebase.FirebaseAuthentication(self.settings.FIREBASE_SECRET, 'philip@sahli.net', extra={'id': 'philipsahli'})
	app = firebase.FirebaseApplication(self.settings.FIREBASE, authentication)
	self.info(self.rid, str(app.__dict__))
	self.info(self.rid, str(app.authentication.__dict__))

	firebase_uid = self.GET.get('user_id')

	debug = self.debug
	info = self.info
	error = self.error
	rid = self.rid

	lcache = {}

	class TutumService(object):

		def __init__(self, api_user, api_key):
			self.api_user = api_user
			self.api_key = api_key

		def _custom_link_data(self, data):

			for app in data:
				new_linked = []
				link_names = []
				for link in app['linked']:
					for link_key, link_value in link.iteritems():
						if link_key == "to_service":
							status, text = self._call(link_value, "GET", get_cached=True)
							#debug(rid, "unique_name")
							#debug(rid, json.dumps(text))
							new_linked.append({
								'name': link['name'],
								'to_service': json.loads(text)['name']
							})
							link_names.append(json.loads(text)['name'])
				app['linked'] = new_linked
				app['link_names'] = link_names
			return data

		def _custom_variables(self, data):
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

			ids = []

			status_code, apps = self._call("/api/v1/service/?limit=100", "GET")
			apps = Bunch(json.loads(apps))
			if apps:
				for app in apps.objects:

					app = Bunch(app)
					if app.state == "Terminated": continue

					status_code, details_api = self._call("/api/v1/service/"+app.uuid+"/", "GET")
					details = Bunch(json.loads(details_api))

					all_env_vars, custom_env_vars = self._custom_variables(details.container_envvars)
					tags = []
					for tag in details.tags:
						#debug(rid, tag)
						#tag.pop("resource_uri")
						tags.append(tag)

					app_dict = {'name': app.name,
								'id': app.uuid,
								'uri': app.resource_uri,
								#'all_env_vars': all_env_vars,
								'custom_env_vars': custom_env_vars,
								'state': app.state,
								'tags': tags,

								# links
								'linked': details.linked_to_service,
								'link_variables': details.link_variables,

								# debug
								'details': details,
								#'full': app,
								}

					# workout to get vars without linked_vars from environment variables
					status, text = self._call("/api/v1/service/"+app.uuid+"/", "GET", get_cached=True)

					conts = []
					ports = []
					status_code, containers = self._call("/api/v1/service/"+app.uuid+"/", "GET", get_cached=True)
					containers = json.loads(containers)
					app_dict['env_vars'] = json.loads(text)['container_envvars']

					container_count = 1
					for container in details.containers:
						status_code, container_data = self._call(container, "GET")

						container_data_json = json.loads(container_data)

						# cleanup, contains keys with '/' and this char is not allowed on firebase
						for link in container_data_json['linked_to_container']:
							if len(link['endpoints']) > 0:
								endpoints = copy.deepcopy(link['endpoints'])
								for k, v in link['endpoints'].iteritems():
									endpoints[k.replace("/", "_")] = v
									del endpoints[k]
								#debug(rid, link['endpoints'])
								debug(rid, "replaces slash to underscore (firebase workaround): "+str(endpoints))
								link['endpoints'] = endpoints

						# running port configuration
						conts.append(container_data_json)

						# generate persistent configuration
						public_ports = {}
						for port in container_data_json['container_ports']:
							portc = {
								'inner_port': port['inner_port'],
								'published': port['published'],
								'protocol': port['protocol']
							}
							if port.has_key('outer_port'):
								if port['outer_port'] == port['inner_port']:
									portc['outer_port'] = port['outer_port']

							ports.append(portc)
							# CENTOS_1_TCP_PUBLIC_ADDR = aaa
							# CENTOS_1_TCP_PUBLIC_PORT = 80
							#debug(rid, port)
							if port['endpoint_uri']:
								name = app.name.replace("-", "_").upper()
								addr_k = "%s_%s_PORT_%s_%s_PUBLIC_ADDR" % (name, container_count, port['inner_port'], port['protocol'].upper())
								addr = re.findall(r'.*:\/\/(.*):.*\/', port['endpoint_uri'], re.I)[0]
								addr_v = addr
								port_k = "%s_%s_PORT_%s_%s_PUBLIC_PORT" % (name, container_count, port['inner_port'], port['protocol'].upper())
								port_v = port['outer_port']
								public_port = {
									addr_k: addr_v,
									port_k: port_v
										}
								public_ports.update(public_port)
								debug(rid, "public_port")
								debug(rid, public_port)

						container_count = container_count+1

					app_dict.update({'containers': conts})
					app_dict.update({'ports': ports})
					app_dict.update({'public_access': public_ports})
					app_dict.update({'image': containers['image_name']})
					ids.append(app_dict)
				# change linked.to_service to app name
				ids = self._custom_link_data(ids)

			return ids

		def _call(self, uri, method, data=None, get_cached=False):
			if method == "GET" and get_cached:
				cached = lcache.get(uri, None)
				if cached is not None:
					return cached[0], cached[1]

			start = int(round(time.time() * 1000))
			base_url = "https://dashboard.tutum.co/"

			headers = {
				'Authorization': "ApiKey %s:%s" % (self.api_user, self.api_key)
			}
			if data:
				headers.update({'Content-Type': 'application/json'})
			headers.update({'Accept': 'application/json'})
			if method == "POST":
				data=json.dumps(data)
				r = requests.post(base_url+uri, headers=headers, data=data)
			elif method == "GET":
				r = requests.get(base_url+uri, headers=headers)
			elif method == "DELETE":
				r = requests.delete(base_url+uri, headers=headers)

			end = int(round(time.time() * 1000))
			#debug(rid, (str(end-start), "_call", uri, method, r.status_code, r.text))
			#info(rid, (str(end-start), "_call", uri, method, r.status_code))
			if method == "GET" and get_cached:
				if not cached:
					lcache.update({uri: [r.status_code, r.text]})
			return r.status_code, r.text

		def _change_state(self, service, uuid, operation, state):
			# initiate state change
			if operation == "delete":
				r = self._call("/api/v1/service/%s/" % uuid, "DELETE")
			else:
				r = self._call("/api/v1/service/%s/%s/" % (uuid, operation), "POST")
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
					"linked_to_service": service.linked,
					"roles": service.roles,
					"container_ports": service.container_ports,
					"tags": service.tags
				}
				info(rid, "START DATA")
				info(rid, data)
				status, response = self._call("/api/v1/service/", "POST",
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

			service.clear_state("Stopped")
			if service.terminate == 1:
				time.sleep(2)
				result = self._change_state(service, service.id, "delete", "Terminated")
				service.clear_state()
			return result, service


	class Firebase(object):

		service_url = "/users/%s/services/%s"
		services_url = "/users/%s/services/"
		services_url_new = "/users/%s/services/%s/"

		config_url = "/users/%s/config/"

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
				#raise Exception("services not found on firebase")
				info(rid, "services not found on firebase")
				service_dict = []
			return service_dict

		def save_service(self, service):
			data = self.app.put(self.services_url_new % (self.user, service.name), "data", service.data)
			return data

		def get_config(self):
			try:
			    result = self.app.get(self.config_url % self.user, None)
			except Exception, e:
				debug(rid, str(e.__dict__))
				debug(rid, str(e.response.__dict__))
				error(rid, e)
			return result


	def get_tutum_service():
		return TutumService(api_user, api_key)

	class Service(object):

		def __init__(self, **kwargs):
			self.name = kwargs['data']['name']
			self.state = kwargs['data']['state']
			self.instance_count = 1
			self.id = kwargs['data'].get('id', None)
			self.image = kwargs['data']['image']
			#self.env_vars = kwargs['data'].get('env_vars', [])
			self.custom_env_vars = kwargs['data'].get('custom_env_vars', [])
			self.uri = kwargs['data'].get('uri', "uri1")
			self.linked = kwargs['data'].get('linked', [])
			self.container_ports = kwargs['data'].get('ports', [])
			self.tags = kwargs['data'].get('tags', [])

			# full
			#self.full = kwargs['data'].get('full', None)
			self.details = kwargs['data'].get('details', None)

			self.terminate = kwargs['terminate']
			role_config = kwargs.get('role_config', False)
			if role_config:
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
				'image': self.image,
				'state': self.state,
				'linked': self.linked,
				'details': self.details,
				#'full': self.full,
				'custom_env_vars': self.custom_env_vars,
				#'env_vars': self.env_vars,
				'ports': self.container_ports,
				'tags': self.tags,
			}

		def get_linked(self):
			linked = []
			for link in self.linked:
				linked.append({
					'name': link['name'],
					'to_service': json.loads(self.tutum_service._call("/api/v1/application/?name="+link['to_application']))['unique_name']
				})
			return linked

		def start(self):
			r = self.tutum_service.start(self)
			return r

		def stop(self):
			return self.tutum_service.stop(self)

		def clear_state(self, state="Terminated"):
			if state=="Terminated":
				self.id = None
			self.state = state

		def terminate(self):
			pass

		def save(self, to):
			to.save_service(self)

		def __str__(self):
			return self.__dict__

	# execute an action
	firebase = Firebase(firebase_uid, self.settings)
	# get user_config
	user_config = Bunch(firebase.get_config())
	api_user = user_config.tutum['api']['user']
	api_key = user_config.tutum['api']['key']

	logms(4)
	if self.POST.has_key('action'):
		service = firebase.get_service(self.POST['service_name'])
		action = self.POST['action']

		if action == "start":
			result, service_new = service.start()
			if result[0] not in [200, 201, 202]:
				raise Exception(result)

			service_new.state = "Running"
			service_new.id = service_new.id
			firebase.save_service(service_new)

			result = service_new.id

		elif action == "stop":
			result, service = service.stop()
			service.id = None
			result = service.state
			firebase.save_service(service)
		else:
			result = False

	# sync
	else:

		info(rid, "Start sync for user %s" % firebase_uid)
		tutum_service = TutumService(user_config.tutum['api']['user'], user_config.tutum['api']['key'])

		# get data from tutum
		tutum_data = tutum_service.get_data(name=None)
		tutum_names = [ a['name'] for a in tutum_data ]

		services = firebase.get_services()

		# Clear state for services which aren't on Tutum anymore.
		for service in services:

			if service not in tutum_names:
				service_obj = firebase.get_service(service)
				service_obj.clear_state()
				firebase.save_service(service_obj)

		# persist data from tutum to firebase
		if tutum_data is not None:
			for service_data in tutum_data:

				# TODO: is there nothing to sync if the service is terminated?
				if not service_data['state'] == "Terminated":
					logms("save "+service_data['name'])

					data = {'name': service_data['name'],
							 'id': service_data['id'],
							 'uri': service_data.get('uri'),
							 'image': service_data['image'],
							 'state': service_data['state'],
							 'linked': service_data['linked'],
							 'details': service_data['details'],
							 #'full': service_data['full'],
							 'custom_env_vars': service_data['custom_env_vars'],
							 'env_vars': service_data['env_vars'],
							 'instances': service_data['containers'],
							 'public_access': service_data['public_access'],
							 'ports': service_data['ports'],
							 'tags': service_data['tags']
							 }
					url = '/users/%s/services/%s/' % (firebase_uid, service_data['name'])
					try:
						app.put(url, "data", data)
					except HTTPError, e:
						error(rid, "%s could not be saved!" % service_data['name'])
						error(rid, str(e))
						error(rid, e.response.text)
						error(rid, json.dumps(data))
						error(rid, url)
						raise e
					logms("saved "+service_data['name'])
		result = tutum_names

	lcache = {}

	info(rid, "done")
	return self.responses.JSONResponse(json.dumps(result))
