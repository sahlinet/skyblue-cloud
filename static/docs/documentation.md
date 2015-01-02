## Documentation

* * * 

### Providers

#### Tutum
skyblue/cloud queries Tutum for containers and can manage their lifecycle. You must provide your username and Api key from Tutum, which can be found in the *"Account info"* page <https://dashboard.tutum.co/account/> under the tab "Api key".

Enter the username and key in the profile page.

#### Docker

> Coming soon.

### Synchronisation
To persist your container configuration on skyblue/cloud initiate the synchronisation with the "Sync" button. This action will take a while, depending on the number of services and containers you run.

* * * 

### Configuration

#### Lifecycle
You can stop and start services. Depending on the selection *"Destroy on stop"* or *"Keep on stop"* the service is terminated (destroyed) or stopped. 

* * * 

### Hooks
For every service you can configure Hook URL's. The Hook URL's are called from your browser with a POST request, the payload is JSON with following entries:

* Name of the service as `name`

* All Variables as `link_variables`

**On start** the start Hook is called after the service has been started. **On stop** the stop hook is called before stoping the service. The service gets stopped only when the hook returned with a successful response code (2xx). The hook can be triggered manually with the button *"Test hook"*.

For a deeper look into the request inspect it with <http://requestb.in/>.
