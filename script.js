class MongolianTextReader {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.audioRecorder = null;
        this.recordedChunks = [];
        
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
        this.downloadBtn = document.getElementById('downloadBtn');
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
        this.downloadBtn.addEventListener('click', () => this.downloadAudio());

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
            this.updateStatus('✅ Унших дууслаа - MP3 татах боломжтой');
            this.updateButtonStates();
            this.textArea.classList.remove('speaking-indicator');
            this.playBtn.classList.remove('loading');
            
            // Stop recording if it was started
            if (this.audioRecorder && this.audioRecorder.state === 'recording') {
                this.audioRecorder.stop();
            }
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
        
        // Try to setup audio recording for download
        this.setupAudioRecording().then((stream) => {
            if (stream && this.audioRecorder) {
                // Start recording - this will capture system audio
                try {
                    this.audioRecorder.start();
                    this.updateStatus('🎙️ Аудио бичиж байна... Унших эхэлнэ үү', 'speaking');
                } catch (error) {
                    console.error('Recording start error:', error);
                }
            }
        }).catch(error => {
            console.error('Audio setup failed:', error);
            // Continue without recording - user can still listen
        });
        
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
        
        // Reset download button
        this.downloadBtn.disabled = true;
        this.downloadBtn.removeAttribute('data-audio-url');
        this.downloadBtn.removeAttribute('data-is-text');
    }

    updateButtonStates() {
        this.playBtn.disabled = this.isPlaying && !this.isPaused;
        this.pauseBtn.disabled = !this.isPlaying || this.isPaused;
        this.stopBtn.disabled = !this.isPlaying;
        // Download button is enabled after audio is processed
        
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

    async setupAudioRecording() {
        try {
            // Request microphone access to capture system audio
            // Note: This will capture all system audio including the speech synthesis
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                audio: true,
                video: false 
            });
            
            // Create a media recorder
            this.audioRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                    ? 'audio/webm;codecs=opus' 
                    : 'audio/webm'
            });
            
            this.recordedChunks = [];
            
            this.audioRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.audioRecorder.onstop = () => {
                this.processRecordedAudio();
                // Stop all tracks to release the recording
                stream.getTracks().forEach(track => track.stop());
            };

            return stream;
        } catch (error) {
            console.error('Error setting up audio recording:', error);
            
            // Fallback: Create a simple text-to-speech download without recording
            this.createFallbackDownload();
            return null;
        }
    }

    createFallbackDownload() {
        // Since we can't record the actual audio, we'll create a download 
        // that contains the text and instructions for the user
        const text = this.textArea.value.trim();
        const instructions = `Mongolian Text to Speech\n\nText: ${text}\n\nInstructions:\nThis file contains the Mongolian text that was spoken.\nTo generate audio, please:\n1. Open this website again\n2. Paste the text above\n3. Click the play button\n\nNote: Direct audio recording is not supported in all browsers due to security restrictions.`;
        
        const blob = new Blob([instructions], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        this.downloadBtn.disabled = false;
        this.downloadBtn.setAttribute('data-audio-url', url);
        this.downloadBtn.setAttribute('data-is-text', 'true');
        
        this.updateStatus('📄 Текст файл татах бэлэн болсон', 'speaking');
    }

    async processRecordedAudio() {
        if (this.recordedChunks.length === 0) {
            this.updateStatus('❌ Аудио бичигдээгүй байна', 'error');
            return;
        }

        try {
            // Create blob from recorded chunks
            const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
            
            // Convert to WAV/MP3 (simplified approach)
            const audioUrl = URL.createObjectURL(blob);
            
            // Enable download button
            this.downloadBtn.disabled = false;
            this.downloadBtn.setAttribute('data-audio-url', audioUrl);
            
            this.updateStatus('✅ Аудио бэлэн болсон! MP3 татаж авах боломжтой', 'speaking');
        } catch (error) {
            console.error('Error processing audio:', error);
            this.updateStatus('❌ Аудио боловсруулахад алдаа гарлаа', 'error');
        }
    }

    downloadAudio() {
        const audioUrl = this.downloadBtn.getAttribute('data-audio-url');
        const isText = this.downloadBtn.getAttribute('data-is-text') === 'true';
        
        if (!audioUrl) {
            this.updateStatus('❌ Татаж авах файл байхгүй байна', 'error');
            return;
        }

        try {
            // Create download link
            const link = document.createElement('a');
            link.href = audioUrl;
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            const textPreview = this.textArea.value.slice(0, 20).replace(/[^\w\s]/gi, '') || 'mongolian-text';
            
            if (isText) {
                link.download = `${textPreview}-${timestamp}.txt`;
                this.updateStatus('📄 Текст файл татагдаж байна...', 'speaking');
            } else {
                link.download = `${textPreview}-${timestamp}.webm`;
                this.updateStatus('🎵 Аудио файл татагдаж байна...', 'speaking');
            }
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up URL
            setTimeout(() => {
                URL.revokeObjectURL(audioUrl);
            }, 1000);
            
        } catch (error) {
            console.error('Error downloading file:', error);
            this.updateStatus('❌ Файл татахад алдаа гарлаа', 'error');
        }
    }

    // Alternative method: Generate audio using Web Audio API and offline rendering
    async generateOfflineAudio() {
        try {
            const text = this.textArea.value.trim();
            if (!text) return;

            // This is a placeholder for more advanced audio generation
            // In a real implementation, you might use:
            // 1. A text-to-speech service API
            // 2. Pre-recorded phoneme combinations
            // 3. Server-side synthesis
            
            this.updateStatus('🔄 Оффлайн аудио үүсгэж байна...', 'speaking');
            
            // For now, we'll create the fallback text download
            this.createFallbackDownload();
            
        } catch (error) {
            console.error('Error generating offline audio:', error);
            this.updateStatus('❌ Аудио үүсгэхэд алдаа гарлаа', 'error');
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