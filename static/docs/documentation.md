## Documentation

<div class="alert alert-info" role="alert">skyblue/cloud is <strong>not a replacement</strong> of the Tutum Dashboard and skyblue/cloud or his creator and contributors are <strong>not associated</strong> directly with Tutum.</div>

* * * 

### Providers

#### Tutum
skyblue/cloud queries Tutum for containers and can manage their lifecycle. You must provide your username and Api key from Tutum, which can be found in the *"Account info"* page <https://dashboard.tutum.co/account/> under the tab "Api key".

Enter the username and key in the profile page.

#### Docker

> Coming soon.

* * * 

### Synchronisation
To persist your container configuration on skyblue/cloud initiate the synchronisation with the "Sync" button. This action will take a while, depending on the number of services and containers you run.

* * * 

### Configuration

#### Lifecycle
Initial creation of a container configuration must be done at the provider.

You can stop and start synchronized services. Depending on the selection *"Destroy on stop"* or *"Keep on stop"* the service is terminated (destroyed) or stopped. 

* * * 

### Hooks
*Web Hooks* permit extending the workflow and apply additional logic. For every service you can configure *Web Hooks*. The hook are called from your browser with a POST request, the values are send in form-data.

* Name of service: `name`


* `link_variables` <font color='gray'>(Tutum only)</font>


* Published ports as: `NAME_CONTAINERCOUNT_PROTOCOL_PUBLIC_ADDR` and `NAME_CONTAINERCOUNT_PROTOCOL_PUBLIC_ADDR`<font color='gray'>(Tutum only)</font>

**On start** the start hook is called after the service has been started. **On stop** the stop hook is called before stopping the service. The service gets stopped only when the hook returned with a successful response code (2xx). The hook can be triggered manually with the button *"Test hook"*. Keep in mind that the same-origin security policy applies (use [CORS](http://de.wikipedia.org/wiki/Cross-Origin_Resource_Sharing) on server-side).

#### Tutum Example
A service started with 

`tutum service run -p 22 -e VARIABLE1=variable1 -n centos philipsahli/centos`

sends following:

`ID = 5d056de4-3fe7-4ac0-accf-9d90cd344cfb`<br/>
`NAME = centos`<br/>
`HOOK_URL = http://localhost:8000/fastapp/base/skyblue-cloud/exec/hook_test_variables/&stop`<br/>
`VARIABLE1 = variable1`<br/>

`CENTOS_ENV_VARIABLE1 = variable1`<br/>
`CENTOS_ENV_TUTUM_CONTAINER_API_URL = https://dashboard.tutum.co/api/v1/container/286bbc0f-f93b-433c-93e5-7e6a7c61118b/`<br/>
`CENTOS_ENV_TUTUM_CONTAINER_HOSTNAME = centos-1.user.cont.tutum.io`<br/>
`CENTOS_ENV_TUTUM_SERVICE_API_URL = https://dashboard.tutum.co/api/v1/service/5d056de4-3fe7-4ac0-accf-9d90cd344cfb/`<br/>
`CENTOS_TUTUM_API_URL = https://dashboard.tutum.co/api/v1/service/5d056de4-3fe7-4ac0-accf-9d90cd344cfb/`<br/>

`CENTOS_NAME = 286bbc0f-f93b-433c-93e5-7e6a7c61118b/CENTOS_1`<br/>

`CENTOS_PORT = tcp://172.17.0.69:22`<br/>
`CENTOS_PORT_22_TCP = tcp://172.17.0.69:22`<br/>
`CENTOS_PORT_22_TCP_ADDR = 172.17.0.69`<br/>
`CENTOS_PORT_22_TCP_PORT = 22`<br/>
`CENTOS_PORT_22_TCP_PROTO = tcp`<br/>

`CENTOS_1_ENV_VARIABLE1 = variable1`<br/>
`CENTOS_1_ENV_TUTUM_CONTAINER_API_URL = https://dashboard.tutum.co/api/v1/container/286bbc0f-f93b-433c-93e5-7e6a7c61118b/`<br/>
`CENTOS_1_ENV_TUTUM_CONTAINER_HOSTNAME = centos-1.user.cont.tutum.io`<br/>
`CENTOS_1_ENV_TUTUM_SERVICE_API_URL = https://dashboard.tutum.co/api/v1/service/5d056de4-3fe7-4ac0-accf-9d90cd344cfb/`<br/>
`CENTOS_1_NAME = 286bbc0f-f93b-433c-93e5-7e6a7c61118b/CENTOS_1`<br/>
`CENTOS_1_PORT = tcp://172.17.0.69:22`<br/>
`CENTOS_1_PORT_22_TCP = tcp://172.17.0.69:22`<br/>
`CENTOS_1_PORT_22_TCP_ADDR = 172.17.0.69`<br/>
`CENTOS_1_PORT_22_TCP_PORT = 22`<br/>
`CENTOS_1_PORT_22_TCP_PROTO = tcp`<br/>

`CENTOS_1_PORT_22_TCP_PUBLIC_ADDR = centos-1.user.cont.tutum.io`<br/>
`CENTOS_1_PORT_22_TCP_PUBLIC_PORT = 49202`<br/>


For a deeper inspection use <http://requestb.in/> with a [Proxy on skyblue/planet](https://sahli.net/blog/proxy-exec-on-planet).