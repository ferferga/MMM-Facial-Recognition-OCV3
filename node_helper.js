'use strict';
const NodeHelper = require('node_helper');

const PythonShell = require('python-shell');
var pythonStarted = false

module.exports = NodeHelper.create({
  
  python_start: function () {
    const self = this;
    const pyshell = new PythonShell("modules/" + this.name + '/lib/mm/facerecognition.py', { mode: 'json', args: [JSON.stringify(this.config)], pythonPath: 'python3'});

    pyshell.on('message', function (message) {
      if (message.hasOwnProperty('status')){
      console.log("[" + self.name + "] " + message.status);
      self.sendSocketNotification('status', {action: "status", message: message.status})
      }
      if (message.hasOwnProperty('login')){
        console.log("[" + self.name + "] " + "User " + self.config.users[message.login.user - 1] + " with confidence " + message.login.confidence + " logged in.");
        self.sendSocketNotification('user', {action: "login", user: message.login.user - 1, confidence: message.login.confidence});
        }
      if (message.hasOwnProperty('logout')){
        console.log("[" + self.name + "] " + "User " + self.config.users[message.logout.user - 1] + " logged out.");
        self.sendSocketNotification('user', {action: "logout", user: message.logout.user - 1});
        }
    });

    pyshell.end(function (err) {
      if (err) throw err;
      console.log("[" + self.name + "] " + 'finished running...');
      self.sendSocketNotification('error', {action: "error"})
    });
  },
  
  // Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    if(notification === 'CONFIG') {
      this.config = payload
      if(!pythonStarted) {
        pythonStarted = true;
        this.python_start();
        };
    };
  }
  
});
