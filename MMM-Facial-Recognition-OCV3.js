/* global Module */

/* Magic Mirror
 * Module: MMM-Facial-Recognition-OC3
 *
 * By Mathieu Goulène - Based on work made by Paul-Vincent Roll 
 * MIT Licensed.
 */

Module.register('MMM-Facial-Recognition-OCV3',{

	defaults: {
		// Threshold for the confidence of a recognized face before it's considered a
		// positive match.  Confidence values below this threshold will be considered
		// a positive match because the lower the confidence value, or distance, the
		// more confident the algorithm is that the face was correctly detected.
		threshold: 50,
		// force the use of a usb webcam on raspberry pi (on other platforms this is always true automatically)
		useUSBCam: false,
		// Path to your training xml
		trainingFile: 'modules/MMM-Facial-Recognition-OCV3/training.xml',
		// recognition intervall in seconds (smaller number = faster but CPU intens!)
		interval: 0.5,
		// Logout delay after last recognition so that a user does not get instantly logged out if he turns away from the mirror for a few seconds
		logoutDelay: 15,
		// Array with usernames (copy and paste from training script)
		users: [],
		//Module set used for strangers and if no user is detected
		defaultClass: "default",
		//Set of modules which should be shown for every user
		everyoneClass: "everyone",
		// Boolean to toggle welcomeMessage
		welcomeMessage: true,
		animationSpeed: 3000,
		HideOnUnknown: false,
		showEye: true
	},

	// Define required translations.
	getTranslations: function() {
		return {
			en: "translations/en.json",
			de: "translations/de.json",
      			es: "translations/es.json",
      			zh: "translations/zh.json",
      			nl: "translations/nl.json",
			sv: "translations/sv.json",
			fr: "translations/fr.json",
			id: "translations/id.json"
		};
	},

	getStyles: function() {
		return ["MMM-Facial-Recognition-OCV3.css"];
	},

	login_user: function () {

    var self = this;

		MM.getModules().withClass(this.config.defaultClass).exceptWithClass(this.config.everyoneClass).enumerate(function(module) {
			module.hide(1000, function() {
				Log.log(module.name + ' is hidden.');
			}, {lockString: self.identifier});
		});

		MM.getModules().withClass(this.current_user).enumerate(function(module) {
			module.show(1000, function() {
				Log.log(module.name + ' is shown.');
			}, {lockString: self.identifier});
		});

		this.sendNotification("CURRENT_USER", this.current_user);
	},
	logout_user: function () {

    var self = this;

		MM.getModules().withClass(this.current_user).enumerate(function(module) {
			module.hide(1000, function() {
				Log.log(module.name + ' is hidden.');
			}, {lockString: self.identifier});
		});

		MM.getModules().withClass(this.config.defaultClass).exceptWithClass(this.config.everyoneClass).enumerate(function(module) {
			module.show(1000, function() {
				Log.log(module.name + ' is shown.');
			}, {lockString: self.identifier});
		});
		this.sendNotification("CURRENT_USER", "None");
	},

	// Override socket notification handler.
	socketNotificationReceived: function(notification, payload) {
		if (payload.action == "status")
		{
			if (payload.message == "Webcam loaded..." || payload.message == "PiCam loaded...")
			{
				this.moduleLoaded = true;
				this.exception = false;
				this.failOnLoad  = false;
				this.updateDom(this.config.animationSpeed)
			}
			else if (payload.message == "Error while loading camera.")
			{
				this.failOnLoad = true;
				this.updateDom(this.config.animationSpeed);
			}
			else if(payload.message == "Error")
			{
				this.exception = true;
				this.updateDom(this.config.animationSpeed);
			}
		}
		if (payload.action == "login"){
			this.logout = false;
			if (this.current_user_id != payload.user){
				this.logout_user()
			}
			if (payload.user == -1 || payload.user == -2){
				this.current_user_id = payload.user;
			}
			else{
				this.current_user = this.config.users[payload.user];
				this.current_user_id = payload.user;
				this.login_user()
			}
			if (payload.confidence == null)
			{
				this.current_user = null
			}
			if (this.config.welcomeMessage) {
				this.updateDom(this.config.animationSpeed)
			}
		}
		else if (payload.action == "logout"){
			this.logout_user()
			this.current_user = null;
			this.current_user_id = payload.user;
			this.logout = true;
			if (this.config.welcomeMessage) {
				this.updateDom(this.config.animationSpeed)
			}
		}
		else if (payload.action == "error")
		{
			this.exception = true;
			this.updateDom(this.config.animationSpeed)
		}
	},

	getDom: function() {
		var wrapper = document.createElement("div");
		wrapper.className = "wrapper";
		if (this.failOnLoad || this.exception)
		{
				var img = document.createElement("img");
				img.src = this.file("icons/error.svg");
				img.style = "width: 30%; height: 30%; filter: invert(100%)";
				wrapper.appendChild(img);
				var camError = document.createElement("p");
				camError.style = "font-size: 14px; line-height: 19px";
				if (this.exception)
				{
					camError.innerHTML = this.translate("error");
				}
				else if (this.failOnLoad)
				{
					camError.innerHTML = this.translate("camError");
				}				
				wrapper.appendChild(camError);
		}
		else if (this.current_user_id != null && this.moduleLoaded)
		{
			if (this.config.HideOnUnknown && this.current_user_id == -1)
			{				
				return wrapper;
			}
			else if (!this.config.HideOnUnknown && this.current_user_id == -1 && !this.logout)
			{
				var msg = this.translate("stranger-message");
				var img = document.createElement("img");
				wrapper.appendChild(img);
			}
			else if (this.current_user != null)
			{
				var msg = this.translate("message").replace("%person", this.current_user) + "<br>";
			}
			else
			{
				var msg = "";
			}
			wrapper.innerHTML = msg;			
			if (this.current_user_id != -1 && this.current_user != null)
			{
				var img = document.createElement("div");
				img.classList.add("photo");
				img.style = "background-image: url(" + this.data.path + "/profiles/" + this.current_user + "/profile.png)";
				wrapper.appendChild(img)				
			}
			else if (this.config.showEye && this.current_user == null && this.logout)
			{
				var img = document.createElement("img");
				img.src = this.file("icons/hello_grey.gif");
				img.style = "width: 30%; height: 30%"
				wrapper.appendChild(img)
			}
		}
		else
		{
			if (this.config.showEye && this.current_user == null && this.moduleLoaded)
			{
				var img = document.createElement("img");
				img.src = this.file("icons/hello_grey.gif");
				img.style = "width: 30%; height: 30%";
				wrapper.appendChild(img);
			}			
		}
		return wrapper;
	},
	notificationReceived: function(notification, payload, sender) {
		if (notification === 'DOM_OBJECTS_CREATED') {
      var self = this;
			MM.getModules().exceptWithClass("default").enumerate(function(module) {
				module.hide(1000, function() {
					Log.log('Module is hidden.');
				}, {lockString: self.identifier});
			});
		}
	},
	start: function() {
		this.current_user = null;
		this.moduleLoaded = false;
		this.sendSocketNotification('CONFIG', this.config);
		Log.info('Starting module: ' + this.name);
	}
});
