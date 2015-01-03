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
*Web Hooks* permit extending the workflow and apply additional logic. For every service you can configure *Web Hooks*. The hook are called from your browser with a POST request, the payload is JSON with following entries:

* Name of the service: `name`

* All container variables: `link_variables`

**On start** the start hook is called after the service has been started. **On stop** the stop hook is called before stopping the service. The service gets stopped only when the hook returned with a successful response code (2xx). The hook can be triggered manually with the button *"Test hook"*. Keep in mind that the same-origin security policy applies (use [CORS](http://de.wikipedia.org/wiki/Cross-Origin_Resource_Sharing) on server-side).

For a deeper inspection use <http://requestb.in/> with a [Proxy on skyblue/planet](https://sahli.net/blog/proxy-exec-on-planet).


