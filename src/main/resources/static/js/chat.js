class ChatBot {
    constructor() {
        this.isLoading = false;
        this.systemPrompt = localStorage.getItem('chatbot-system-prompt') || '';
        this.widthInputHandler = null;
        this.heightInputHandler = null;
        this.textareaInputHandler = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialContent();
        this.loadSavedSettings();
        // Ensure quick replies are bound on initialization
        setTimeout(() => this.bindQuickReplyEvents(), 100);
    }

    loadSavedSettings() {
        // Load and apply saved dimensions
        const savedWidth = localStorage.getItem('chatbot-width') || '100';
        const savedHeight = localStorage.getItem('chatbot-height') || '95';

        const widget = document.getElementById('chatWidget');
        if (widget) {
            widget.style.width = `${savedWidth}%`;
            widget.style.height = `${savedHeight}%`;
        }
    }

    bindEvents() {
        // UI Controls
        const minimizeBtn = document.getElementById('minimizeBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const closeSettings = document.getElementById('closeSettings');
        const applySettings = document.getElementById('applySettings');
        const clearChatBtn = document.getElementById('clearChatBtn');
        const resetSettings = document.getElementById('resetSettings');
        const chatForm = document.getElementById('chatForm');

        if (minimizeBtn) minimizeBtn.onclick = () => this.toggleMinimize();
        if (settingsBtn) settingsBtn.onclick = () => this.openSettings();
        if (closeSettings) closeSettings.onclick = () => this.closeSettings();
        if (applySettings) applySettings.onclick = () => this.applySettings();
        if (clearChatBtn) clearChatBtn.onclick = () => this.clearChat();
        if (resetSettings) resetSettings.onclick = () => this.resetSettings();
        if (chatForm) chatForm.onsubmit = (e) => this.handleSubmit(e);

        // Close modal when clicking outside
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.closeSettings();
                }
            };
        }

        // Input enhancements
        const input = document.getElementById('messageInput');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSubmit(e);
                }
            });

            // Clear selection when user starts typing
            input.addEventListener('input', () => {
                this.clearQuickReplySelections();
            });
        }
    }

    bindQuickReplyEvents() {
        const qrDiv = document.getElementById('quickReplies');
        if (!qrDiv) return;

        // Get all quick reply buttons
        const allButtons = qrDiv.querySelectorAll('.quick-reply-btn');

        allButtons.forEach(btn => {
            // Remove existing listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            // Add event listeners
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Get prompt from various sources
                const prompt = newBtn.getAttribute('data-prompt') ||
                              newBtn.getAttribute('title') ||
                              newBtn.textContent.trim();

                if (prompt) {
                    this.selectQuickReply(newBtn, prompt);
                }
            });

            // Add hover effects
            newBtn.addEventListener('mouseenter', () => {
                if (!newBtn.classList.contains('selected')) {
                    newBtn.style.transform = 'translateY(-2px)';
                    newBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }
            });

            newBtn.addEventListener('mouseleave', () => {
                if (!newBtn.classList.contains('selected')) {
                    newBtn.style.transform = 'translateY(0)';
                    newBtn.style.boxShadow = '';
                }
            });
        });
    }

    clearQuickReplySelections() {
        const container = document.getElementById('quickReplies');
        if (container) {
            const allButtons = container.querySelectorAll('.quick-reply-btn');
            allButtons.forEach(btn => {
                btn.classList.remove('selected');
                btn.style.backgroundColor = '';
                btn.style.color = '';
                btn.style.transform = '';
                btn.style.boxShadow = '';
            });
        }
    }

    selectQuickReply(btn, prompt) {
        const input = document.getElementById('messageInput');
        if (!input) return;

        // Set the input value
        input.value = prompt;
        input.focus();

        // Clear previous selections
        this.clearQuickReplySelections();

        // Highlight selected button
        btn.classList.add('selected');
        btn.style.backgroundColor = '#007bff';
        btn.style.color = 'white';
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';

        // Auto-submit after delay for better UX
        setTimeout(() => {
            if (input.value === prompt && document.activeElement === input) {
                const form = document.getElementById('chatForm');
                if (form) {
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(submitEvent);
                }
            }
        }, 800);
    }

    renderQuickReplies(prompts) {
        const qrDiv = document.getElementById('quickReplies');
        if (!qrDiv) return;

        // Clear only dynamically added replies, preserve server-rendered ones
        const dynamicReplies = qrDiv.querySelectorAll('.dynamic-reply');
        dynamicReplies.forEach(reply => reply.remove());

        if (!prompts || prompts.length === 0) {
            // If no dynamic prompts, ensure server-rendered ones have proper event handlers
            this.bindQuickReplyEvents();
            return;
        }

        // Add dynamic prompts
        prompts.forEach((prompt, index) => {
            const btn = document.createElement('button');
            btn.className = 'quick-reply-btn dynamic-reply';
            btn.type = 'button';
            btn.textContent = prompt.length > 50 ? prompt.substring(0, 47) + '...' : prompt;
            btn.title = prompt;
            btn.setAttribute('data-prompt', prompt);
            btn.setAttribute('data-index', index);
            qrDiv.appendChild(btn);
        });

        // Bind events to all buttons (both server-rendered and dynamic)
        this.bindQuickReplyEvents();
    }

    async refreshQuickReplies() {
        try {
            const prompts = await this.fetchPrompts();
            this.renderQuickReplies(prompts);
        } catch (error) {
            console.error('Failed to refresh quick replies:', error);
            // Fallback: just bind events to existing buttons
            this.bindQuickReplyEvents();
        }
    }

    toggleMinimize() {
        const widget = document.getElementById('chatWidget');
        if (widget) {
            widget.classList.toggle('minimized');
        }
    }

    updateRangeValues() {
        const widthSlider = document.getElementById('chatWidth');
        const heightSlider = document.getElementById('chatHeight');
        const widthValue = document.getElementById('widthValue');
        const heightValue = document.getElementById('heightValue');

        if (widthSlider && widthValue) {
            widthValue.textContent = widthSlider.value + '%';

            if (this.widthInputHandler) {
                widthSlider.removeEventListener('input', this.widthInputHandler);
            }

            this.widthInputHandler = () => {
                widthValue.textContent = widthSlider.value + '%';
            };
            widthSlider.addEventListener('input', this.widthInputHandler);
        }

        if (heightSlider && heightValue) {
            heightValue.textContent = heightSlider.value + '%';

            if (this.heightInputHandler) {
                heightSlider.removeEventListener('input', this.heightInputHandler);
            }

            this.heightInputHandler = () => {
                heightValue.textContent = heightSlider.value + '%';
            };
            heightSlider.addEventListener('input', this.heightInputHandler);
        }
    }

    updateCharacterCount() {
        const textarea = document.getElementById('systemPrompt');
        const charCount = document.getElementById('promptCharCount');

        if (textarea && charCount) {
            const count = textarea.value.length;
            charCount.textContent = count;
            charCount.style.color = count > 450 ? '#dc3545' : '#6c757d';

            if (this.textareaInputHandler) {
                textarea.removeEventListener('input', this.textareaInputHandler);
            }

            this.textareaInputHandler = () => {
                const currentCount = textarea.value.length;
                charCount.textContent = Math.min(currentCount, 500);
                charCount.style.color = currentCount > 450 ? '#dc3545' : '#6c757d';

                if (currentCount > 500) {
                    textarea.value = textarea.value.substring(0, 500);
                    charCount.textContent = '500';
                }
            };
            textarea.addEventListener('input', this.textareaInputHandler);
        }
    }

    openSettings() {
        const modal = document.getElementById('settingsModal');
        const systemPromptField = document.getElementById('systemPrompt');
        const widthSlider = document.getElementById('chatWidth');
        const heightSlider = document.getElementById('chatHeight');

        if (!modal) {
            console.error('Settings modal not found');
            return;
        }

        if (systemPromptField) {
            systemPromptField.value = this.systemPrompt;
        }

        const widget = document.getElementById('chatWidget');
        let currentWidth = 100;
        let currentHeight = 95;

        if (widget && widget.style.width) {
            currentWidth = parseInt(widget.style.width) || 100;
        }
        if (widget && widget.style.height) {
            currentHeight = parseInt(widget.style.height) || 95;
        }

        if (widthSlider) widthSlider.value = currentWidth;
        if (heightSlider) heightSlider.value = currentHeight;

        modal.style.display = 'flex';
        modal.style.opacity = '0';

        requestAnimationFrame(() => {
            modal.style.opacity = '1';
        });

        this.updateRangeValues();
        this.updateCharacterCount();
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
        }
    }

    resetSettings() {
        if (confirm('Reset all settings to default values?')) {
            const widthSlider = document.getElementById('chatWidth');
            const heightSlider = document.getElementById('chatHeight');
            const systemPromptField = document.getElementById('systemPrompt');

            if (widthSlider) widthSlider.value = 100;
            if (heightSlider) heightSlider.value = 95;
            if (systemPromptField) systemPromptField.value = '';

            this.updateRangeValues();
            this.updateCharacterCount();

            const widget = document.getElementById('chatWidget');
            if (widget) {
                widget.style.width = '100%';
                widget.style.height = '95%';
            }

            this.systemPrompt = '';
            localStorage.removeItem('chatbot-system-prompt');
            localStorage.removeItem('chatbot-width');
            localStorage.removeItem('chatbot-height');
        }
    }

    applySettings() {
        const widthSlider = document.getElementById('chatWidth');
        const heightSlider = document.getElementById('chatHeight');
        const systemPromptField = document.getElementById('systemPrompt');

        if (!widthSlider || !heightSlider || !systemPromptField) {
            this.showValidationError('Settings form elements not found');
            return;
        }

        const width = parseInt(widthSlider.value);
        const height = parseInt(heightSlider.value);
        const systemPrompt = systemPromptField.value.trim();

        if (width < 50 || width > 100) {
            this.showValidationError('Width must be between 50-100%');
            return;
        }

        if (height < 50 || height > 100) {
            this.showValidationError('Height must be between 50-100%');
            return;
        }

        if (systemPrompt.length > 500) {
            this.showValidationError('System prompt must be 500 characters or less');
            return;
        }

        const widget = document.getElementById('chatWidget');
        if (widget) {
            widget.style.width = `${width}%`;
            widget.style.height = `${height}%`;
        }

        this.systemPrompt = systemPrompt;
        localStorage.setItem('chatbot-system-prompt', systemPrompt);
        localStorage.setItem('chatbot-width', width.toString());
        localStorage.setItem('chatbot-height', height.toString());

        this.showSuccessMessage('Settings applied successfully!');

        setTimeout(() => {
            this.closeSettings();
        }, 1000);
    }

    showValidationError(message) {
        this.removeExistingMessages();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'settings-error';
        errorDiv.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            padding: 8px 12px;
            border-radius: 6px;
            margin: 10px 0;
            font-size: 0.9rem;
            border: 1px solid #f5c6cb;
            animation: fadeIn 0.3s ease;
        `;
        errorDiv.textContent = message;

        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.appendChild(errorDiv);
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 4000);
        }
    }

    showSuccessMessage(message) {
        this.removeExistingMessages();

        const successDiv = document.createElement('div');
        successDiv.className = 'settings-success';
        successDiv.style.cssText = `
            background: #d4edda;
            color: #155724;
            padding: 8px 12px;
            border-radius: 6px;
            margin: 10px 0;
            font-size: 0.9rem;
            border: 1px solid #c3e6cb;
            animation: fadeIn 0.3s ease;
        `;
        successDiv.textContent = message;

        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.appendChild(successDiv);
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.remove();
                }
            }, 3000);
        }
    }

    removeExistingMessages() {
        const existingError = document.querySelector('.settings-error');
        const existingSuccess = document.querySelector('.settings-success');
        if (existingError) existingError.remove();
        if (existingSuccess) existingSuccess.remove();
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            const messagesContainer = document.getElementById('messages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
                this.loadWelcomeMessage();
                setTimeout(() => {
                    this.refreshQuickReplies();
                }, 100);
            }
        }
    }

    appendMessage(text, isUser = false, isPending = false) {
        const messages = document.getElementById('messages');
        if (!messages) {
            console.error('Messages container not found');
            return null;
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isUser ? 'user' : 'bot'}${isPending ? ' pending-reply' : ''}`;

        const label = document.createElement('span');
        label.className = 'sender-label';
        label.textContent = isUser ? 'user:' : 'bot:';

        const textNode = document.createTextNode(' ' + text);

        msgDiv.appendChild(label);
        msgDiv.appendChild(textNode);
        messages.appendChild(msgDiv);
        messages.scrollTop = messages.scrollHeight;

        return msgDiv;
    }

    getConversationHistory() {
        const messages = document.querySelectorAll('#messages .message:not(.pending-reply)');
        return Array.from(messages)
            .map(msg => msg.textContent)
            .join('\n')
            .trim();
    }

    async fetchWithErrorHandling(url, options) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    async fetchPrompts() {
        try {
            const conversation = this.getConversationHistory();
            const response = await this.fetchWithErrorHandling('/suggest-prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'conversation=' + encodeURIComponent(conversation)
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch prompts:', error);
            return [];
        }
    }

    async sendMessage(message) {
        try {
            let body = 'message=' + encodeURIComponent(message);
            if (this.systemPrompt) {
                body += '&systemPrompt=' + encodeURIComponent(this.systemPrompt);
            }

            const response = await this.fetchWithErrorHandling('/send', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: body,
            });
            return await response.text();
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isLoading) return;

        const input = document.getElementById('messageInput');
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        this.isLoading = true;
        input.disabled = true;

        this.appendMessage(message, true);
        input.value = '';

        const pendingDiv = this.appendMessage('typing...', false, true);

        try {
            const reply = await this.sendMessage(message);

            if (pendingDiv) {
                const label = pendingDiv.querySelector('.sender-label');
                pendingDiv.textContent = '';
                if (label) {
                    pendingDiv.appendChild(label);
                }
                pendingDiv.appendChild(document.createTextNode(' ' + reply));
                pendingDiv.classList.remove('pending-reply');
            }

            await this.refreshQuickReplies();

        } catch (error) {
            if (pendingDiv) {
                const label = pendingDiv.querySelector('.sender-label');
                pendingDiv.textContent = '';
                if (label) {
                    pendingDiv.appendChild(label);
                }
                pendingDiv.appendChild(document.createTextNode(' Sorry, I encountered an error. Please try again.'));
                pendingDiv.classList.remove('pending-reply');
                pendingDiv.classList.add('error');
            }
        } finally {
            this.isLoading = false;
            input.disabled = false;
            input.focus();
        }
    }

    loadWelcomeMessage() {
        this.appendMessage(
            "Hi there! Nice to see you 😊 We have a 10% promo code for new customers! Would you like to get one now? 🎁"
        );
    }

    async loadInitialContent() {
        this.loadWelcomeMessage();
        setTimeout(async () => {
            await this.refreshQuickReplies();
        }, 100);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        new ChatBot();
    } catch (error) {
        console.error('Failed to initialize ChatBot:', error);
    }
});