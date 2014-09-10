from setuptools import setup

setup(name='skyblue-cloud',
	version="MASTER",
	description='Reusable Django app for prototyping',
	long_description='django-fastapp is a reusable Django app which lets you prototype apps in the browser with client- and server-side elements.',
	url="https://github.com/fatrix/django-fastapp",
	author="Philip Sahli",
	author_email="philip@sahli.net",
    #install_requires=['dropbox==1.6', 
	#	'requests==2.0.1', 
	#	'django_extensions==1.3.5', 
	#	'pusher==0.8',
	#	'mongoengine==0.8.6',
	#	'pymongo==2.6.3',
	#	'bunch==1.0.1',
	#	'gevent==1.0',
	#	'pika==0.9.13',
	#	'jsonfield==0.9.22',
	#	'pyflakes==0.8.1',
	#	'configobj==5.0.5'
	#],
    py_modules = ['app.cloud'],
    #package_data = {'fastapp': ['fastapp/templates/*']},
    #include_package_data=True,
    license ='MIT'
)