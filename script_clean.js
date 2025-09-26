class MongolianTextReader {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.mongolianVoice = null;
        this.audioRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.audioContext = null;
        this.audioStream = null;
        
        this.init();
    }

    async init() {
        this.initializeElements();
        this.setupEventListeners();
        await this.loadGoogleBataaVoice();
        this.updateStatus('✅ Google Bataa дуу бэлэн байна', 'ready');
    }

    initializeElements() {
        // Core elements
        this.textArea = document.getElementById('mongolianText');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.recordToggleBtn = document.getElementById('recordToggleBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.statusDiv = document.getElementById('status');
        
        // Settings
        this.speedSlider = document.getElementById('speed');
        this.pitchSlider = document.getElementById('pitch');
        this.volumeSlider = document.getElementById('volume');
        this.speedValue = document.getElementById('speedValue');
        this.pitchValue = document.getElementById('pitchValue');
        this.volumeValue = document.getElementById('volumeValue');
        
        // Sample buttons
        this.sampleButtons = document.querySelectorAll('.sample-btn');
    }

    setupEventListeners() {
        // Main controls
        this.playBtn.addEventListener('click', () => this.playText());
        this.pauseBtn.addEventListener('click', () => this.pauseText());
        this.stopBtn.addEventListener('click', () => this.stopText());
        this.clearBtn.addEventListener('click', () => this.clearText());
        this.recordToggleBtn.addEventListener('click', () => this.toggleRecording());
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
            btn.addEventListener('click', () => {
                this.textArea.value = btn.getAttribute('data-text');
                this.textArea.focus();
            });
        });

        // Keyboard shortcuts
        this.textArea.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'enter':
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
                    case 'escape':
                        e.preventDefault();
                        this.stopText();
                        break;
                }
            }
        });
    }

    async loadGoogleBataaVoice() {
        return new Promise((resolve) => {
            const loadVoices = () => {
                const voices = this.synth.getVoices();
                console.log('🔍 Searching for Google Bataa voice...');
                console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
                
                // Priority order for Google Bataa voice
                this.mongolianVoice = 
                    // 1st Priority: Google Bataa (exact match)
                    voices.find(voice => 
                        voice.name.toLowerCase().includes('bataa')
                    ) ||
                    // 2nd Priority: Google Mongolian voices
                    voices.find(voice => 
                        voice.name.toLowerCase().includes('google') && 
                        (voice.lang.toLowerCase().includes('mn') || 
                         voice.lang.toLowerCase().includes('mongolian'))
                    ) ||
                    // 3rd Priority: Any Mongolian language voice
                    voices.find(voice => 
                        voice.lang.toLowerCase().includes('mn') || 
                        voice.lang.toLowerCase().includes('mongolian')
                    ) ||
                    // 4th Priority: Any Google voice (fallback)
                    voices.find(voice => 
                        voice.name.toLowerCase().includes('google')
                    ) ||
                    // 5th Priority: Default system voice
                    voices.find(voice => voice.default) ||
                    // Final fallback
                    voices[0];

                if (this.mongolianVoice) {
                    if (this.mongolianVoice.name.toLowerCase().includes('bataa')) {
                        console.log('🇲🇳 ✅ Google Bataa олдлоо!', this.mongolianVoice.name);
                    } else if (this.mongolianVoice.lang.toLowerCase().includes('mn')) {
                        console.log('🇲🇳 ⚡ Монгол хэлний дуу олдлоо:', this.mongolianVoice.name);
                    } else {
                        console.log('🌍 📢 Резерв дуу ашиглаж байна:', this.mongolianVoice.name);
                    }
                    resolve();
                } else {
                    console.log('❌ Дуу олдсонгүй');
                    resolve();
                }
            };

            // Load voices immediately if available
            if (this.synth.getVoices().length > 0) {
                loadVoices();
            } else {
                // Wait for voices to load (Chrome/Safari compatibility)
                this.synth.onvoiceschanged = () => {
                    loadVoices();
                };
                
                // Fallback timeout for edge cases
                setTimeout(() => {
                    if (!this.mongolianVoice) {
                        loadVoices();
                    }
                }, 1000);
            }
        });
    }

    playText() {
        const text = this.textArea.value.trim();
        
        if (!text) {
            this.updateStatus('❌ Текст оруулна уу!', 'error');
            return;
        }

        if (this.isPaused) {
            this.resumeText();
            return;
        }

        // Stop any current speech and recording
        this.synth.cancel();
        this.stopRecordingIfActive();

        // Create new utterance
        this.utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice and language
        if (this.mongolianVoice) {
            this.utterance.voice = this.mongolianVoice;
            
            // Use native language if Mongolian, otherwise force Mongolian setting
            if (this.mongolianVoice.lang.toLowerCase().includes('mn')) {
                this.utterance.lang = this.mongolianVoice.lang;
            } else {
                this.utterance.lang = 'mn-MN';
            }
        } else {
            this.utterance.lang = 'mn-MN';
        }

        // Optimize voice parameters for Mongolian
        this.utterance.rate = Math.max(0.7, Math.min(1.3, parseFloat(this.speedSlider.value)));
        this.utterance.pitch = Math.max(0.9, Math.min(1.2, parseFloat(this.pitchSlider.value)));
        this.utterance.volume = Math.max(0.1, Math.min(1.0, parseFloat(this.volumeSlider.value)));

        // Set up event handlers
        this.utterance.onstart = () => {
            this.isPlaying = true;
            this.isPaused = false;
            this.updateStatus('🎵 Google Bataa унших явцдаа...', 'speaking');
            this.updateButtonStates();
            this.textArea.classList.add('speaking-indicator');
            
            // Start recording when speech begins
            this.startRecording();
        };

        this.utterance.onend = () => {
            this.isPlaying = false;
            this.isPaused = false;
            this.updateStatus('✅ Унших дууслаа - Татах боломжтой!', 'success');
            this.updateButtonStates();
            this.textArea.classList.remove('speaking-indicator');
            
            // Stop recording and prepare download
            this.stopRecording();
        };

        this.utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            this.updateStatus('❌ Дуу гаргахад алдаа гарлаа', 'error');
            this.isPlaying = false;
            this.isPaused = false;
            this.updateButtonStates();
            this.stopRecordingIfActive();
        };

        // Start speech synthesis
        this.playBtn.classList.add('loading');
        this.synth.speak(this.utterance);
    }

    pauseText() {
        if (this.isPlaying && !this.isPaused) {
            this.synth.pause();
            this.isPaused = true;
            this.updateStatus('⏸️ Түр зогссон байна', 'paused');
            this.updateButtonStates();
        }
    }

    resumeText() {
        if (this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
            this.updateStatus('▶️ Үргэлжлүүлж байна...', 'speaking');
            this.updateButtonStates();
        }
    }

    stopText() {
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.updateStatus('⏹️ Зогссон байна', 'stopped');
        this.updateButtonStates();
        this.textArea.classList.remove('speaking-indicator');
        this.playBtn.classList.remove('loading');
        this.stopRecordingIfActive();
    }

    clearText() {
        this.textArea.value = '';
        this.stopText();
        this.resetDownload();
        this.textArea.focus();
    }

    async startRecording() {
        try {
            console.log('🎙️ Starting audio recording...');
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Get user media for recording (microphone)
            this.audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            // Create MediaRecorder
            const mimeType = this.getSupportedMimeType();
            this.audioRecorder = new MediaRecorder(this.audioStream, { mimeType });
            this.recordedChunks = [];
            
            this.audioRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.audioRecorder.onstop = () => {
                this.processRecordedAudio();
            };

            // Start recording
            this.audioRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            
        } catch (error) {
            console.error('Recording failed:', error);
            this.createFallbackAudio();
        }
    }

    stopRecording() {
        if (this.isRecording && this.audioRecorder && this.audioRecorder.state === 'recording') {
            this.audioRecorder.stop();
            this.isRecording = false;
        }
        
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
    }

    stopRecordingIfActive() {
        if (this.isRecording) {
            this.stopRecording();
        }
    }

    processRecordedAudio() {
        if (this.recordedChunks.length > 0) {
            const mimeType = this.getSupportedMimeType();
            const blob = new Blob(this.recordedChunks, { type: mimeType });
            const audioUrl = URL.createObjectURL(blob);
            
            // Enable download
            this.downloadBtn.disabled = false;
            this.downloadBtn.setAttribute('data-audio-url', audioUrl);
            this.downloadBtn.setAttribute('data-mime-type', mimeType);
            
            console.log('✅ Audio recorded successfully:', blob.size, 'bytes');
        } else {
            console.log('⚠️ No audio data recorded, creating fallback');
            this.createFallbackAudio();
        }
    }

    createFallbackAudio() {
        // Create a simple tone as fallback
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const duration = 2;
        const sampleRate = audioContext.sampleRate;
        const length = sampleRate * duration;
        
        const buffer = audioContext.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate a simple tone
        for (let i = 0; i < length; i++) {
            data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1;
        }
        
        // Convert to WAV blob
        const wavBlob = this.audioBufferToWav(buffer);
        const audioUrl = URL.createObjectURL(wavBlob);
        
        this.downloadBtn.disabled = false;
        this.downloadBtn.setAttribute('data-audio-url', audioUrl);
        this.downloadBtn.setAttribute('data-mime-type', 'audio/wav');
        
        console.log('📢 Fallback audio created');
    }

    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/wav'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return 'audio/webm'; // fallback
    }

    audioBufferToWav(buffer) {
        const length = buffer.length;
        const arrayBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(arrayBuffer);
        const channelData = buffer.getChannelData(0);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, buffer.sampleRate, true);
        view.setUint32(28, buffer.sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // PCM data
        let offset = 44;
        for (let i = 0; i < length; i++) {
            view.setInt16(offset, channelData[i] * 0x7FFF, true);
            offset += 2;
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    downloadAudio() {
        const audioUrl = this.downloadBtn.getAttribute('data-audio-url');
        const mimeType = this.downloadBtn.getAttribute('data-mime-type') || 'audio/webm';
        
        if (!audioUrl) {
            this.updateStatus('❌ Татах файл байхгүй байна', 'error');
            return;
        }

        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const textPreview = this.textArea.value.slice(0, 20).replace(/[^\w\s]/gi, '') || 'mongolian-speech';
        const extension = this.getFileExtension(mimeType);
        const filename = `bataa-${textPreview}-${timestamp}.${extension}`;

        // Create download link
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.updateStatus(`✅ ${filename} татагдлаа!`, 'success');
        
        // Clean up after delay
        setTimeout(() => {
            URL.revokeObjectURL(audioUrl);
        }, 2000);
    }

    getFileExtension(mimeType) {
        const extensions = {
            'audio/webm': 'webm',
            'audio/mp4': 'm4a',
            'audio/wav': 'wav',
            'audio/ogg': 'ogg'
        };
        return extensions[mimeType] || 'webm';
    }

    toggleRecording() {
        // This is handled automatically during speech
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.updateStatus('▶️ Текст унших товчийг дарж аудио бичлэг эхлүүлнэ үү', 'info');
        }
    }

    resetDownload() {
        this.downloadBtn.disabled = true;
        this.downloadBtn.removeAttribute('data-audio-url');
        this.downloadBtn.removeAttribute('data-mime-type');
    }

    updateStatus(message, type = 'info') {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `status ${type}`;
        
        // Auto-clear success/error messages after 5 seconds
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                if (this.statusDiv.textContent === message) {
                    this.statusDiv.textContent = 'Бэлэн байна';
                    this.statusDiv.className = 'status ready';
                }
            }, 5000);
        }
    }

    updateButtonStates() {
        // Update button states based on current status
        this.playBtn.disabled = this.isPlaying && !this.isPaused;
        this.pauseBtn.disabled = !this.isPlaying || this.isPaused;
        this.stopBtn.disabled = !this.isPlaying;
        
        // Update record button
        this.recordToggleBtn.textContent = this.isRecording ? '🔴 Бичиж байна' : '🎙️ Бичлэг';
        this.recordToggleBtn.disabled = this.isPlaying; // Only allow manual recording when not playing
        
        // Clear loading state if stopped
        if (!this.isPlaying) {
            this.playBtn.classList.remove('loading');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Mongolian Text Reader with Google Bataa voice...');
    
    // Check browser compatibility
    if (!window.speechSynthesis) {
        alert('Таны browser Speech Synthesis API дэмжихгүй байна. Chrome эсвэл Edge ашиглана уу.');
        return;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('MediaDevices API not supported. Recording may not work.');
    }

    // Create the reader instance
    window.mongolianReader = new MongolianTextReader();
    
    console.log('✅ Google Bataa Text Reader initialized successfully!');
    console.log('🎯 Keyboard shortcuts:');
    console.log('- Ctrl + Enter: Play text');
    console.log('- Ctrl + Space: Pause/Resume');
    console.log('- Ctrl + Escape: Stop');
});