/*
  NLP Chat controller for Waistline voice assistant
*/

(function() {
  'use strict';
  
  var NLPChatController = {
    init: function() {
      this.recognition = null;
      this.isRecognizing = false;
      this.bindEvents();
      console.log("NLP Chat controller initialized");
    },
    
    bindEvents: function() {
      // Bind events when page is initialized
      app.on('pageInit', function(page) {
        if (page.name === 'nlp-chat') {
          this.initializeSpeechRecognition();
          
          // Bind microphone button
          $$(document).on('click', '#start-voice-recognition', this.toggleSpeechRecognition.bind(this));
        }
      }.bind(this));
      
      // Clean up when page is removed
      app.on('pageBeforeRemove', function(page) {
        if (page.name === 'nlp-chat') {
          this.stopSpeechRecognition();
          $$(document).off('click', '#start-voice-recognition');
        }
      }.bind(this));
    },
    
    initializeSpeechRecognition: function() {
      try {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
          var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = false;
          this.recognition.lang = 'en-US';
          this.recognition.interimResults = false;
          this.recognition.maxAlternatives = 1;
          
          this.recognition.onstart = this.onRecognitionStart.bind(this);
          this.recognition.onresult = this.onRecognitionResult.bind(this);
          this.recognition.onerror = this.onRecognitionError.bind(this);
          this.recognition.onend = this.onRecognitionEnd.bind(this);
          
          console.log("Speech recognition initialized");
          this.updateStatus("Ready");
        } else {
          console.error("Speech recognition not supported");
          this.updateOutput("Speech recognition is not supported in your browser. Please try using a different browser like Chrome.");
          this.updateStatus("Not available");
        }
      } catch(e) {
        console.error("Error initializing speech recognition:", e);
        this.updateOutput("There was an error initializing speech recognition. Please check your permissions and try again.");
        this.updateStatus("Error");
      }
    },
    
    toggleSpeechRecognition: function() {
      if (this.isRecognizing) {
        this.stopSpeechRecognition();
      } else {
        this.startSpeechRecognition();
      }
    },
    
    startSpeechRecognition: function() {
      if (this.recognition) {
        try {
          // Request microphone permission on Android
          if (cordova && cordova.plugins && cordova.plugins.permissions) {
            cordova.plugins.permissions.requestPermission(
              cordova.plugins.permissions.RECORD_AUDIO,
              (status) => {
                if (status.hasPermission) {
                  this.recognition.start();
                } else {
                  this.updateOutput("Microphone permission is required for voice recognition.");
                  this.updateStatus("Permission denied");
                }
              },
              () => {
                this.updateOutput("Failed to request microphone permission.");
                this.updateStatus("Error");
              }
            );
          } else {
            // Web or iOS doesn't need explicit permission handling
            this.recognition.start();
          }
        } catch(e) {
          console.error("Error starting speech recognition:", e);
          this.updateOutput("There was an error starting speech recognition. Please try again.");
        }
      }
    },
    
    stopSpeechRecognition: function() {
      if (this.recognition && this.isRecognizing) {
        try {
          this.recognition.stop();
        } catch(e) {
          console.error("Error stopping speech recognition:", e);
        }
      }
    },
    
    onRecognitionStart: function() {
      this.isRecognizing = true;
      this.updateStatus("Listening...");
      $$('#start-voice-recognition i').removeClass('fa-microphone').addClass('fa-stop');
    },
    
    onRecognitionResult: function(event) {
      if (event.results && event.results.length > 0) {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
          const transcript = result[0].transcript;
          this.updateOutput("You said: " + transcript);
          
          // Process with NLP handler
          if (app.NLPChat && app.NLPChat.handler) {
            const response = app.NLPChat.handler.processInput(transcript);
            setTimeout(() => {
              this.updateOutput("Assistant: " + response.message);
            }, 500);
          } else {
            console.error("NLP Handler not available");
            this.updateOutput("Assistant: I'm having trouble understanding right now. Please try again later.");
          }
        }
      }
    },
    
    onRecognitionError: function(event) {
      console.error("Recognition error:", event.error);
      let errorMsg = "There was an error with speech recognition.";
      
      switch(event.error) {
        case 'no-speech':
          errorMsg = "No speech was detected. Please try again.";
          break;
        case 'not-allowed':
        case 'permission-denied':
          errorMsg = "Microphone access is not allowed. Please check your permissions.";
          break;
        case 'network':
          errorMsg = "Network error occurred. Please check your connection.";
          break;
      }
      
      this.updateOutput(errorMsg);
      this.updateStatus("Error");
      this.isRecognizing = false;
      $$('#start-voice-recognition i').removeClass('fa-stop').addClass('fa-microphone');
    },
    
    onRecognitionEnd: function() {
      this.isRecognizing = false;
      this.updateStatus("Ready");
      $$('#start-voice-recognition i').removeClass('fa-stop').addClass('fa-microphone');
    },
    
    updateOutput: function(text) {
      // Update UI with recognition result
      const outputContainer = $$('.nlp-messages-container');
      if (outputContainer.length > 0) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        
        // Determine if this is a user or assistant message
        if (text.startsWith('You said:')) {
          messageEl.classList.add('user-message');
        } else {
          messageEl.classList.add('app-message');
        }
        
        messageEl.textContent = text;
        outputContainer.append(messageEl);
        outputContainer[0].scrollTop = outputContainer[0].scrollHeight;
      }
    },
    
    updateStatus: function(status) {
      // Update status display
      const statusEl = $$('#nlp-status');
      if (statusEl.length > 0) {
        statusEl.text(status);
      }
    }
  };
  
  // Initialize when document is ready
  $$(document).on('page:init', '.page[data-name="nlp-chat"]', function (e) {
    NLPChatController.init();
    
    // Bind event handlers for the chat interface
    $$(document).on('click', '#nlp-mic-button', function() {
      if (window.nlpHandler) {
        window.nlpHandler.startListening();
      } else {
        console.error("NLP Handler not initialized");
      }
    });
    
    $$(document).on('click', '#nlp-send-button', function() {
      const input = $$('#nlp-text-input');
      const text = input.val().trim();
      
      if (text) {
        if (window.nlpHandler) {
          window.nlpHandler.addMessageToChat(text, 'user');
          const response = window.nlpHandler.processCompleteStatement(text);
          input.val('');
        } else {
          console.error("NLP Handler not initialized");
        }
      }
    });
  });
  
  // Export to app namespace
  app.NLPChat = app.NLPChat || {};
  app.NLPChat.controller = NLPChatController;
})();
