class MongolianTextReader {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.isPaused = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadVoices();
        
        // Load voices when they become available
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    initializeElements() {
        this.textArea = document.getElementById('mongolianText');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.speedSlider = document.getElementById('speed');
        this.pitchSlider = document.getElementById('pitch');
        this.volumeSlider = document.getElementById('volume');
        this.speedValue = document.getElementById('speedValue');
        this.pitchValue = document.getElementById('pitchValue');
        this.volumeValue = document.getElementById('volumeValue');
        this.statusDiv = document.getElementById('status');
        this.sampleButtons = document.querySelectorAll('.sample-btn');
    }

    setupEventListeners() {
        // Control buttons
        this.playBtn.addEventListener('click', () => this.playText());
        this.pauseBtn.addEventListener('click', () => this.pauseText());
        this.stopBtn.addEventListener('click', () => this.stopText());
        this.clearBtn.addEventListener('click', () => this.clearText());

        // Settings sliders
        this.speedSlider.addEventListener('input', (e) => {
            this.speedValue.textContent = e.target.value + 'x';
        });

        this.pitchSlider.addEventListener('input', (e) => {
            this.pitchValue.textContent = e.target.value;
        });

        this.volumeSlider.addEventListener('input', (e) => {
            this.volumeValue.textContent = Math.round(e.target.value * 100) + '%';
        });

        // Sample text buttons
        this.sampleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sampleText = e.target.getAttribute('data-text');
                this.textArea.value = sampleText;
                this.textArea.focus();
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.playText();
                        break;
                    case ' ':
                        e.preventDefault();
                        if (this.isPlaying && !this.isPaused) {
                            this.pauseText();
                        } else if (this.isPaused) {
                            this.resumeText();
                        } else {
                            this.playText();
                        }
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.stopText();
                        break;
                }
            }
        });
    }

    loadVoices() {
        const voices = this.synth.getVoices();
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        
        // Try to find Mongolian or similar voices
        this.mongolianVoice = voices.find(voice => 
            voice.lang.toLowerCase().includes('mn') || 
            voice.lang.toLowerCase().includes('mongolian')
        );

        // Fallback to other suitable voices
        if (!this.mongolianVoice) {
            this.mongolianVoice = voices.find(voice => 
                voice.lang.toLowerCase().includes('zh') || // Chinese might work for some Mongolian
                voice.lang.toLowerCase().includes('ru') || // Russian
                voice.lang.toLowerCase().includes('en')    // English as final fallback
            ) || voices[0];
        }

        if (this.mongolianVoice) {
            console.log('Selected voice:', this.mongolianVoice.name, this.mongolianVoice.lang);
        }
    }

    playText() {
        const text = this.textArea.value.trim();
        
        if (!text) {
            this.updateStatus('Текст оруулна уу!', 'error');
            return;
        }

        if (this.isPaused) {
            this.resumeText();
            return;
        }

        // Stop any current speech
        this.synth.cancel();

        // Create new utterance
        this.utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice if available
        if (this.mongolianVoice) {
            this.utterance.voice = this.mongolianVoice;
        }

        // Set properties from sliders
        this.utterance.rate = parseFloat(this.speedSlider.value);
        this.utterance.pitch = parseFloat(this.pitchSlider.value);
        this.utterance.volume = parseFloat(this.volumeSlider.value);

        // Set up event handlers
        this.utterance.onstart = () => {
            this.isPlaying = true;
            this.isPaused = false;
            this.updateStatus('🎵 Унших явц дах байна...', 'speaking');
            this.updateButtonStates();
            this.textArea.classList.add('speaking-indicator');
            this.playBtn.classList.remove('loading');
        };

        this.utterance.onend = () => {
            this.isPlaying = false;
            this.isPaused = false;
            this.updateStatus('✅ Унших дууслаа');
            this.updateButtonStates();
            this.textArea.classList.remove('speaking-indicator');
            this.playBtn.classList.remove('loading');
        };

        this.utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.isPlaying = false;
            this.isPaused = false;
            this.updateStatus('❌ Алдаа гарлаа: ' + event.error, 'error');
            this.updateButtonStates();
            this.textArea.classList.remove('speaking-indicator');
            this.playBtn.classList.remove('loading');
        };

        this.utterance.onpause = () => {
            this.isPaused = true;
            this.updateStatus('⏸️ Түр зогссон байна');
            this.updateButtonStates();
        };

        this.utterance.onresume = () => {
            this.isPaused = false;
            this.updateStatus('▶️ Унших явц дах байна...', 'speaking');
            this.updateButtonStates();
        };

        // Add loading animation
        this.playBtn.classList.add('loading');
        
        // Start speaking
        this.synth.speak(this.utterance);
    }

    pauseText() {
        if (this.isPlaying && !this.isPaused) {
            this.synth.pause();
        }
    }

    resumeText() {
        if (this.isPaused) {
            this.synth.resume();
        }
    }

    stopText() {
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.updateStatus('Зогссон байна');
        this.updateButtonStates();
        this.textArea.classList.remove('speaking-indicator');
    }

    clearText() {
        this.stopText();
        this.textArea.value = '';
        this.textArea.focus();
        this.updateStatus('Бэлэн байна');
    }

    updateButtonStates() {
        this.playBtn.disabled = this.isPlaying && !this.isPaused;
        this.pauseBtn.disabled = !this.isPlaying || this.isPaused;
        this.stopBtn.disabled = !this.isPlaying;
        
        // Update play button text based on state
        const playIcon = this.playBtn.querySelector('.icon');
        const playText = this.playBtn.childNodes[1];
        
        if (this.isPaused) {
            playIcon.textContent = '▶️';
            playText.textContent = 'Үргэлжлүүлэх';
        } else {
            playIcon.textContent = '▶️';
            playText.textContent = 'Унших';
        }
    }

    updateStatus(message, type = '') {
        this.statusDiv.textContent = message;
        this.statusDiv.className = 'status';
        if (type) {
            this.statusDiv.classList.add(type);
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
        alert('Уучлаарай, таны browser text-to-speech дэмждэггүй байна.');
        return;
    }

    // Initialize the Mongolian text reader
    const reader = new MongolianTextReader();

    // Add some helpful information
    console.log('Mongolian Text Reader initialized');
    console.log('Keyboard shortcuts:');
    console.log('- Ctrl + Enter: Play text');
    console.log('- Ctrl + Space: Play/Pause toggle');
    console.log('- Ctrl + Escape: Stop');

    // Show browser compatibility info
    const statusDiv = document.getElementById('status');
    const originalText = statusDiv.textContent;
    statusDiv.textContent = 'Дуу ачаалж байна...';
    
    // Wait a bit for voices to load
    setTimeout(() => {
        statusDiv.textContent = originalText;
    }, 1000);
});

// Add some utility functions
window.mongolianTextReader = {
    // Function to add custom text programmatically
    addCustomText: function(text) {
        const textArea = document.getElementById('mongolianText');
        textArea.value = text;
        textArea.focus();
    },

    // Function to get current settings
    getSettings: function() {
        return {
            speed: document.getElementById('speed').value,
            pitch: document.getElementById('pitch').value,
            volume: document.getElementById('volume').value
        };
    },

    // Function to set settings
    setSettings: function(settings) {
        if (settings.speed) document.getElementById('speed').value = settings.speed;
        if (settings.pitch) document.getElementById('pitch').value = settings.pitch;
        if (settings.volume) document.getElementById('volume').value = settings.volume;
        
        // Update display values
        document.getElementById('speedValue').textContent = settings.speed + 'x';
        document.getElementById('pitchValue').textContent = settings.pitch;
        document.getElementById('volumeValue').textContent = Math.round(settings.volume * 100) + '%';
    }
};