class UIManager {
    constructor() {
        // Initialize state
        this._initialized = false;
        this._eventListeners = [];
        this._timeouts = [];
        this._animationFrames = [];
        this._callbacks = {};
        
        // Cache DOM elements
        this.game = null;
        this.elements = {
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingProgress: document.getElementById('loading-progress'),
            loadingText: document.getElementById('loading-text'),
            mainMenu: document.getElementById('main-menu'),
            gameUI: document.getElementById('game-ui'),
            scoreContainer: document.getElementById('score-container'),
            player1Score: document.getElementById('player1-score'),
            player2Score: document.getElementById('player2-score'),
            turnIndicator: document.getElementById('turn-indicator'),
            powerMeter: {
                container: document.getElementById('power-meter'),
                fill: document.getElementById('power-fill'),
                text: document.getElementById('power-text')
            },
            messageBox: {
                container: document.getElementById('message-box'),
                title: document.getElementById('message-title'),
                text: document.getElementById('message-text'),
                button: document.getElementById('message-button')
            },
            // Modals
            howToPlayModal: document.getElementById('how-to-play-modal'),
            settingsModal: document.getElementById('settings-modal'),
            gameOverModal: document.getElementById('game-over-modal'),
            // Buttons
            startButton: document.getElementById('start-button'),
            howToPlayButton: document.getElementById('how-to-play-button'),
            settingsButton: document.getElementById('settings-button'),
            menuButton: document.getElementById('menu-button'),
            // Settings
            volumeSlider: document.getElementById('volume-slider'),
            graphicsQuality: document.getElementById('graphics-quality'),
            enableShadows: document.getElementById('enable-shadows'),
            // Game over
            gameOverTitle: document.getElementById('game-over-title'),
            gameOverText: document.getElementById('game-over-text'),
            playAgainButton: document.getElementById('play-again-button'),
            mainMenuButton: document.getElementById('main-menu-button')
        };

        // Initialize UI state with validation
        this._validScreens = new Set(['loading', 'menu', 'game', 'settings', 'gameOver']);
        this._currentScreen = 'loading';
        this.isMenuOpen = false;
        this.isModalOpen = false;
        
        // Bind event listeners
        this.bindEvents();
    }

    init(game) {
        try {
            if (!game) {
                throw new Error('Game instance is required');
            }
            this.game = game;
            this.bindEvents();
            this.updateLoadingProgress(0, 'Loading...');
            return Promise.resolve();
        } catch (error) {
            console.error('Error initializing UIManager:', error);
            return Promise.reject(error);
        }
    }

    showError(message, title = 'Error', onClose = null) {
        try {
            console.error(`${title}:`, message);
            
            // Ensure message is a string
            const errorMessage = typeof message === 'string' ? message : 
                               message?.message || 'An unknown error occurred';
            
            // Try to use the message box if available
            if (this.elements?.messageBox?.container) {
                this.showMessage(
                    title,
                    errorMessage,
                    'OK',
                    () => {
                        try {
                            if (typeof onClose === 'function') {
                                onClose();
                            } else {
                                window.location.reload();
                            }
                        } catch (e) {
                            console.error('Error in error handler callback:', e);
                            window.location.reload();
                        }
                    }
                );
            } else {
                // Fallback to alert if UI isn't ready
                alert(`${title}: ${errorMessage}`);
                if (typeof onClose === 'function') {
                    try {
                        onClose();
                    } catch (e) {
                        console.error('Error in error handler callback (fallback):', e);
                    }
                }
            }
        } catch (error) {
            // Last resort error handling
            console.error('Critical error in showError:', error);
            try {
                alert(`A critical error occurred: ${error.message || 'Unknown error'}`);
            } catch (e) {
                // If even alert fails, log to console
                console.error('Could not show error to user:', e);
            }
        }
    }

    // Screen state management
    get currentScreen() {
        return this._currentScreen;
    }
    
    set currentScreen(screen) {
        if (!this._validScreens.has(screen)) {
            console.warn(`Invalid screen state: ${screen}`);
            return;
        }
        
        const oldScreen = this._currentScreen;
        this._currentScreen = screen;
        
        // Emit screen change event
        this.emit('screenChange', { from: oldScreen, to: screen });
    }
    
    updateLoadingText(text) {
        try {
            if (this.elements.loadingText && typeof text === 'string') {
                this.elements.loadingText.textContent = text;
            }
        } catch (error) {
            console.error('Error updating loading text:', error);
        }
    }

    hideLoadingScreen() {
        try {
            if (!this._initialized) {
                console.warn('UI Manager not initialized');
                return;
            }
            
            console.log('Hiding loading screen...');
            
            // Get loading overlay with null check
            const loadingOverlay = this.elements?.loadingOverlay || 
                                 document.getElementById('loading-overlay');
            
            if (!loadingOverlay) {
                console.warn('Loading overlay not found');
                return;
            }
            
            // If not found in cache, try direct DOM access
            if (!loadingOverlay || !(loadingOverlay instanceof HTMLElement)) {
                console.warn('Loading overlay not found in cache, trying direct DOM access');
                loadingOverlay = document.getElementById('loading-overlay');
            }
            
            if (loadingOverlay instanceof HTMLElement) {
                // Use requestAnimationFrame for smoother animations
                requestAnimationFrame(() => {
                    try {
                        loadingOverlay.style.opacity = '0';
                        loadingOverlay.style.transition = 'opacity 0.3s ease-out';
                        
                        // Remove from DOM after fade out
                        setTimeout(() => {
                            try {
                                loadingOverlay.style.display = 'none';
                                console.log('Loading screen hidden');
                                
                                // Clean up event listeners
                                this.off('loadingComplete');
                            } catch (e) {
                                console.error('Error in loading screen hide timeout:', e);
                            }
                        }, 300);
                    } catch (e) {
                        console.error('Error animating loading screen:', e);
                        loadingOverlay.style.display = 'none';
                    }
                });
            } else {
                console.warn('Loading overlay element not found in DOM');
            }
        } catch (error) {
            console.error('Error in hideLoadingScreen:', error);
            // Last resort: try to hide any loading overlay by ID
            try {
                const directAccess = document.getElementById('loading-overlay');
                if (directAccess) {
                    directAccess.style.display = 'none';
                }
            } catch (e) {
                console.error('Critical error in hideLoadingScreen fallback:', e);
            }
        }
    }

    bindEvents() {
        try {
            // Menu buttons
            this.safeAddEventListener(this.elements.startButton, 'click', () => this.emit('startGame'));
            this.safeAddEventListener(this.elements.howToPlayButton, 'click', () => this.showModal('howToPlay'));
            this.safeAddEventListener(this.elements.settingsButton, 'click', () => this.showModal('settings'));
            this.safeAddEventListener(this.elements.menuButton, 'click', () => this.toggleMenu());
            
            // Game over buttons
            this.safeAddEventListener(this.elements.playAgainButton, 'click', () => this.emit('playAgain'));
            this.safeAddEventListener(this.elements.mainMenuButton, 'click', () => this.showScreen('menu'));
            
            // Settings
            this.safeAddEventListener(this.elements.volumeSlider, 'input', (e) => {
                this.emit('volumeChange', parseFloat(e.target.value));
            });
            
            this.safeAddEventListener(this.elements.graphicsQuality, 'change', (e) => {
                this.emit('graphicsQualityChange', e.target.value);
            });
            
            this.safeAddEventListener(this.elements.enableShadows, 'change', (e) => {
                this.emit('shadowsToggle', e.target.checked);
            });
            
            // Modal close buttons - use event delegation for dynamic elements
            document.body.addEventListener('click', (e) => {
                try {
                    const closeButton = e.target.closest('.modal-close');
                    if (closeButton) {
                        this.hideModal();
                    }
                } catch (error) {
                    console.error('Error handling modal close:', error);
                }
            });
            
        } catch (error) {
            console.error('Error in bindEvents:', error);
            this.showError('Failed to initialize UI controls. Some features may not work.', 'UI Error');
        }
    }
    
    /**
     * Safely add an event listener with error handling
     * @param {HTMLElement} element - The element to add the listener to
     * @param {string} event - The event name
     * @param {Function} handler - The event handler
     * @param {Object} [options] - Event listener options
     * @param {string} [namespace] - Optional namespace for the event
     * @returns {Function} A function to remove this specific event listener
     */
    safeAddEventListener(element, event, handler, options, namespace) {
        try {
            if (!element || typeof element.addEventListener !== 'function') {
                console.warn(`Invalid element for event listener: ${event}`, element);
                return () => {}; // Return noop function for consistency
            }
            
            if (typeof handler !== 'function') {
                console.warn(`Invalid handler for ${event} event`);
                return () => {};
            }
            
            // Create a wrapped handler for better error handling
            const wrappedHandler = (e) => {
                try {
                    return handler(e);
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error);
                    this.showError(
                        'An error occurred in the UI. Some features may not work correctly.',
                        'UI Error'
                    );
                }
            };
            
            // Add the event listener
            element.addEventListener(event, wrappedHandler, options);
            
            // Generate a unique ID for this listener
            const listenerId = `${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Store reference for cleanup
            const listener = {
                element, 
                event, 
                handler: wrappedHandler, 
                originalHandler: handler,
                options 
            };
            
            this._eventListeners.push(listener);
            return true;
            
        } catch (error) {
            console.error(`Error adding ${event} listener:`, error);
            return false;
        }
    }

    /**
     * Clean up all resources and event listeners
     * @param {Object} [options] - Cleanup options
     * @param {boolean} [options.preserveState=false] - Whether to preserve the initialized state
     * @param {string[]} [options.preserveNamespaces] - Namespaces of listeners to preserve
     */
    cleanup({ preserveState = false, preserveNamespaces = [] } = {}) {
        try {
            console.log('Starting UI Manager cleanup...');
            
            // Clean up event listeners
            if (this._eventListeners?.length) {
                // Create a copy of the array to avoid mutation during iteration
                const listeners = [...this._eventListeners];
                
                listeners.forEach(({ element, event, handler, options, namespace }) => {
                    try {
                        // Skip if this namespace should be preserved
                        if (namespace && preserveNamespaces.includes(namespace)) {
                            return;
                        }
                        
                        if (element && element.removeEventListener) {
                            element.removeEventListener(event, handler, options);
                        }
                    } catch (error) {
                        console.error(`Error removing ${event} listener:`, error);
                    }
                });
                
                // Only clear non-preserved listeners
                if (preserveNamespaces.length) {
                    this._eventListeners = this._eventListeners.filter(
                        l => l.namespace && preserveNamespaces.includes(l.namespace)
                    );
                } else {
                    this._eventListeners = [];
                }
            }
            
            // Clear timeouts
            if (this._timeouts?.length) {
                this._timeouts.forEach(timeoutId => {
                    try {
                        clearTimeout(timeoutId);
                    } catch (error) {
                        console.error('Error clearing timeout:', error);
                    }
                });
                this._timeouts = [];
            }
            
            // Clear animation frames
            if (this._animationFrames?.length) {
                this._animationFrames.forEach(frameId => {
                    try {
                        cancelAnimationFrame(frameId);
                    } catch (error) {
                        console.error('Error cancelling animation frame:', error);
                    }
                });
                this._animationFrames = [];
            }
            
            // Clear callbacks if not preserving state
            if (!preserveState) {
                this._callbacks = {};
                this._initialized = false;
                
                // Reset UI state
                this._currentScreen = 'loading';
                this.isMenuOpen = false;
                this.isModalOpen = false;
                
                // Clear any modal backdrops
                if (typeof this.hideAllModals === 'function') {
                    this.hideAllModals();
                }
                
                // Reset any UI elements that might hold state
                if (typeof this.resetUIElements === 'function') {
                    this.resetUIElements();
                }
            }
            
            console.log('UI Manager cleanup completed');
            
        } catch (error) {
            console.error('Error during cleanup:', error);
            // Try to recover by forcing a full cleanup
            try {
                this._eventListeners = [];
                this._timeouts = [];
                this._animationFrames = [];
                this._callbacks = {};
                this._initialized = false;
            } catch (e) {
                console.error('Critical error during forced cleanup:', e);
            }
        }
    }

    off(event, callback) {
        this._callbacks = this._callbacks || {};
        if (!this._callbacks[event]) return this;
        
        if (callback) {
            const index = this._callbacks[event].indexOf(callback);
            if (index !== -1) this._callbacks[event].splice(index, 1);
        } else {
            delete this._callbacks[event];
        }
        
        return this;
    }

    emit(event, ...args) {
        this._callbacks = this._callbacks || {};
        const callbacks = this._callbacks[event];
        if (callbacks) {
            callbacks.forEach(callback => callback.apply(this, args));
        }
        return this;
    }

    // Screen management
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show the requested screen
        switch(screenName) {
            case 'loading':
                this.elements.loadingOverlay.classList.remove('hidden');
                break;
            case 'menu':
                this.elements.mainMenu.classList.remove('hidden');
                break;
            case 'game':
                this.elements.gameUI.classList.remove('hidden');
                break;
        }
        
        this.currentScreen = screenName;
    }

    // Loading screen
    updateLoadingProgress(progress, message = '') {
        if (this.elements.loadingProgress) {
            this.elements.loadingProgress.style.width = `${progress * 100}%`;
        }
        
        if (this.elements.loadingText && message) {
            this.elements.loadingText.textContent = message;
        }
    }

    // Game UI
    /**
     * Update player information in the UI
     * @param {Player} player1 - First player object
     * @param {Player} player2 - Second player object
     */
    updatePlayerInfo(player1, player2) {
        try {
            // Update player 1 info
            if (this.elements.player1Score) {
                this.elements.player1Score.textContent = player1.score || 0;
            }
            
            // Update player 2 info
            if (this.elements.player2Score) {
                this.elements.player2Score.textContent = player2.score || 0;
            }
            
            // Update turn indicator if available
            if (this.elements.turnIndicator) {
                const currentPlayer = this.game?.currentPlayerIndex === 0 ? player1 : player2;
                this.elements.turnIndicator.textContent = `${currentPlayer.isAI ? 'AI' : 'Player ' + (this.game.currentPlayerIndex + 1)}'s Turn`;
                this.elements.turnIndicator.className = `turn-indicator ${currentPlayer.isAI ? 'ai-turn' : 'player-turn'}`;
            }
            
            // Update any other player-related UI elements here
            
        } catch (error) {
            console.error('Error updating player info:', error);
        }
    }
    
    updateScores(player1Score, player2Score) {
        if (this.elements.player1Score) {
            this.elements.player1Score.textContent = player1Score;
        }
        
        if (this.elements.player2Score) {
            this.elements.player2Score.textContent = player2Score;
        }
    }

    updateTurnIndicator(playerName, isPlayerTurn) {
        if (this.elements.turnIndicator) {
            this.elements.turnIndicator.textContent = `${playerName}'s Turn`;
            this.elements.turnIndicator.className = `turn-indicator ${isPlayerTurn ? 'player-turn' : 'ai-turn'}`;
        }
    }

    updatePowerMeter(power, maxPower = 1) {
        if (!this.elements.powerMeter.container) return;
        
        const percentage = Math.min(100, Math.max(0, (power / maxPower) * 100));
        
        if (this.elements.powerMeter.fill) {
            this.elements.powerMeter.fill.style.width = `${percentage}%`;
            
            // Change color based on power level
            if (percentage < 30) {
                this.elements.powerMeter.fill.style.backgroundColor = '#4CAF50'; // Green
            } else if (percentage < 70) {
                this.elements.powerMeter.fill.style.backgroundColor = '#FFC107'; // Yellow
            } else {
                this.elements.powerMeter.fill.style.backgroundColor = '#F44336'; // Red
            }
        }
        
        if (this.elements.powerMeter.text) {
            this.elements.powerMeter.text.textContent = `${Math.round(percentage)}%`;
        }
    }

    showPowerMeter(show = true) {
        if (this.elements.powerMeter.container) {
            this.elements.powerMeter.container.style.display = show ? 'block' : 'none';
        }
    }

    // Messages
    /**
     * Shows a message box to the user
     * @param {string} title - The title of the message
     * @param {string} message - The message content
     * @param {string} [buttonText='OK'] - Text for the action button
     * @param {Function} [callback=null] - Callback when the button is clicked
     */
    showMessage(title, message, buttonText = 'OK', callback = null) {
        try {
            const { messageBox } = this.elements;
            
            if (!messageBox || !messageBox.container) {
                console.warn('Message box elements not found');
                return;
            }
            
            // Set message content
            if (messageBox.title) {
                messageBox.title.textContent = title || '';
            }
            
            if (messageBox.text) {
                messageBox.text.textContent = message || '';
            }
            
            // Configure button
            if (messageBox.button) {
                messageBox.button.textContent = buttonText || 'OK';
                
                // Remove any existing click handlers
                const newButton = messageBox.button.cloneNode(true);
                messageBox.button.parentNode.replaceChild(newButton, messageBox.button);
                messageBox.button = newButton;
                
                // Add new click handler
                this.safeAddEventListener(messageBox.button, 'click', () => {
                    this.hideMessage();
                    if (typeof callback === 'function') {
                        try {
                            callback();
                        } catch (error) {
                            console.error('Error in message callback:', error);
                        }
                    }
                });
            }
            
            // Show the message box
            messageBox.container.style.display = 'block';
            
            // Add to active modals
            this.isModalOpen = true;
            
        } catch (error) {
            console.error('Error showing message:', error);
            // Fallback to alert if something goes wrong
            alert(`${title || 'Message'}: ${message || 'An error occurred'}`);
        }
    }
    
    /**
     * Hides the currently shown message
     */
    hideMessage() {
        try {
            const { messageBox } = this.elements;
            if (messageBox?.container) {
                messageBox.container.style.display = 'none';
                this.isModalOpen = false;
            }
        } catch (error) {
            console.error('Error hiding message:', error);
        }
    }

    // Modals
    /**
     * Shows the specified modal dialog
     * @param {string} modalName - Name of the modal to show (without 'Modal' suffix)
     * @param {Object} [options] - Additional options
     * @param {boolean} [options.hideOthers=true] - Whether to hide other modals first
     */
    showModal(modalName, { hideOthers = true } = {}) {
        try {
            if (!modalName || typeof modalName !== 'string') {
                throw new Error('Modal name must be a non-empty string');
            }
            
            const modalKey = `${modalName}${modalName.endsWith('Modal') ? '' : 'Modal'}`;
            const modal = this.elements[modalKey];
            
            if (!modal) {
                console.warn(`Modal '${modalName}' not found`);
                return false;
            }
            
            // Hide other modals if requested
            if (hideOthers) {
                this.hideAllModals();
            }
            
            // Show the requested modal
            modal.classList.add('active');
            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');
            
            // Update state
            this.isModalOpen = true;
            this.currentModal = modalName;
            
            // Add body class for styling
            document.body.classList.add('modal-open');
            
            // Focus the first focusable element
            this.focusFirstFocusable(modal);
            
            return true;
            
        } catch (error) {
            console.error(`Error showing modal '${modalName}':`, error);
            return false;
        }
    }
    
    /**
     * Hides the currently open modal
     * @param {string} [modalName] - Optional specific modal to hide
     * @returns {boolean} Whether the modal was successfully hidden
     */
    hideModal(modalName) {
        try {
            let modal;
            
            if (modalName) {
                // Hide specific modal
                const modalKey = `${modalName}${modalName.endsWith('Modal') ? '' : 'Modal'}`;
                modal = this.elements[modalKey];
            } else {
                // Hide all modals if no specific one is provided
                return this.hideAllModals();
            }
            
            if (!modal) {
                console.warn(`Modal '${modalName}' not found`);
                return false;
            }
            
            // Hide the modal
            modal.classList.remove('active');
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            
            // Update state if this was the current modal
            if (this.currentModal === modalName) {
                this.currentModal = null;
                this.isModalOpen = false;
                
                // Remove body class if no more modals are open
                if (!document.querySelector('.modal.active')) {
                    document.body.classList.remove('modal-open');
                }
            }
            
            return true;
            
        } catch (error) {
            console.error(`Error hiding modal '${modalName}':`, error);
            return false;
        }
    }
    
    /**
     * Hides all open modals
     * @returns {boolean} Whether any modals were hidden
     */
    hideAllModals() {
        try {
            const modals = document.querySelectorAll('.modal');
            let anyHidden = false;
            
            modals.forEach(modal => {
                try {
                    if (modal.classList.contains('active')) {
                        modal.classList.remove('active');
                        modal.style.display = 'none';
                        modal.setAttribute('aria-hidden', 'true');
                        anyHidden = true;
                    }
                } catch (e) {
                    console.error('Error hiding modal:', e);
                }
            });
            
            // Update state
            this.currentModal = null;
            this.isModalOpen = false;
            document.body.classList.remove('modal-open');
            
            return anyHidden;
            
        } catch (error) {
            console.error('Error hiding all modals:', error);
            return false;
        }
    }
    
    /**
     * Focuses the first focusable element in a container
     * @private
     */
    focusFirstFocusable(container) {
        try {
            if (!container) return;
            
            // Find focusable elements
            const focusableSelectors = [
                'a[href]',
                'button:not([disabled])',
                'input:not([disabled])',
                'select:not([disabled])',
                'textarea:not([disabled])',
                '[tabindex]:not([tabindex="-1"])'
            ];
            
            const focusable = container.querySelectorAll(focusableSelectors.join(','));
            if (focusable.length > 0) {
                focusable[0].focus();
            }
        } catch (error) {
            console.error('Error focusing element:', error);
        }
    }

    /**
     * Toggles the game menu open/closed
     * @param {boolean} [forceState] - Optional: force menu to be open (true) or closed (false)
     * @returns {boolean} The new menu state
     */
    toggleMenu(forceState = null) {
        try {
            const newState = forceState !== null ? forceState : !this.isMenuOpen;
            
            // Only proceed if state is actually changing
            if (this.isMenuOpen === newState) {
                return this.isMenuOpen;
            }
            
            this.isMenuOpen = newState;
            
            // Update menu visibility
            if (this.elements.mainMenu) {
                if (this.isMenuOpen) {
                    this.elements.mainMenu.classList.add('menu-open');
                    this.elements.mainMenu.setAttribute('aria-expanded', 'true');
                    
                    // Focus the first focusable element when opening
                    this.focusFirstFocusable(this.elements.mainMenu);
                    
                    // Add event listener for escape key to close menu
                    this._menuEscapeHandler = (e) => {
                        if (e.key === 'Escape') {
                            this.toggleMenu(false);
                        }
                    };
                    document.addEventListener('keydown', this._menuEscapeHandler);
                    
                } else {
                    this.elements.mainMenu.classList.remove('menu-open');
                    this.elements.mainMenu.setAttribute('aria-expanded', 'false');
                    
                    // Remove escape key listener
                    if (this._menuEscapeHandler) {
                        document.removeEventListener('keydown', this._menuEscapeHandler);
                        this._menuEscapeHandler = null;
                    }
                    
                    // Return focus to menu button when closing
                    if (this.elements.menuButton) {
                        this.elements.menuButton.focus();
                    }
                }
                
                // Emit event for state changes
                this.emit('menuStateChange', this.isMenuOpen);
            }
            
            return this.isMenuOpen;
            
        } catch (error) {
            console.error('Error toggling menu:', error);
            return this.isMenuOpen;
        }
    }
    
    /**
     * Closes the menu if it's open
     * @returns {boolean} Whether the menu is now closed
     */
    closeMenu() {
        if (this.isMenuOpen) {
            return this.toggleMenu(false);
        }
        return true;
    }
    
    /**
     * Opens the menu if it's closed
     * @returns {boolean} Whether the menu is now open
     */
    openMenu() {
        if (!this.isMenuOpen) {
            return this.toggleMenu(true);
        }
        return true;
    }

    /**
     * Shows the game over screen with results
     * @param {string} winner - 'player' or 'ai' or 'tie'
     * @param {number} playerScore - Final player score
     * @param {number} aiScore - Final AI score
     * @param {Object} [options] - Additional options
     * @param {Function} [options.onPlayAgain] - Callback when play again is clicked
     * @param {Function} [options.onMainMenu] - Callback when main menu is clicked
     */
    showGameOver(winner, playerScore, aiScore, { onPlayAgain = null, onMainMenu = null } = {}) {
        try {
            // Validate inputs
            if (!['player', 'ai', 'tie'].includes(winner)) {
                console.warn(`Invalid winner: ${winner}. Must be 'player', 'ai', or 'tie'`);
                winner = 'tie';
            }
            
            playerScore = Number(playerScore) || 0;
            aiScore = Number(aiScore) || 0;
            
            // Update UI elements
            if (this.elements.gameOverTitle) {
                const titleText = {
                    'player': 'You Win!',
                    'ai': 'Game Over',
                    'tie': 'Game Over - Tie!'
                }[winner];
                this.elements.gameOverTitle.textContent = titleText;
            }
            
            if (this.elements.gameOverText) {
                this.elements.gameOverText.textContent = `Final Score - You: ${playerScore} | AI: ${aiScore}`;
            }
            
            // Set up play again button
            if (this.elements.playAgainButton) {
                // Clone to remove existing event listeners
                const newButton = this.elements.playAgainButton.cloneNode(true);
                this.elements.playAgainButton.parentNode.replaceChild(newButton, this.elements.playAgainButton);
                this.elements.playAgainButton = newButton;
                
                this.safeAddEventListener(this.elements.playAgainButton, 'click', () => {
                    this.hideModal('gameOver');
                    if (typeof onPlayAgain === 'function') {
                        try {
                            onPlayAgain();
                        } catch (error) {
                            console.error('Error in play again callback:', error);
                        }
                    }
                });
            }
            
            // Set up main menu button
            if (this.elements.mainMenuButton) {
                // Clone to remove existing event listeners
                const newButton = this.elements.mainMenuButton.cloneNode(true);
                this.elements.mainMenuButton.parentNode.replaceChild(newButton, this.elements.mainMenuButton);
                this.elements.mainMenuButton = newButton;
                
                this.safeAddEventListener(this.elements.mainMenuButton, 'click', () => {
                    this.hideModal('gameOver');
                    if (typeof onMainMenu === 'function') {
                        try {
                            onMainMenu();
                        } catch (error) {
                            console.error('Error in main menu callback:', error);
                        }
                    }
                });
            }
            
            // Show the modal
            this.showModal('gameOver');
            
        } catch (error) {
            console.error('Error showing game over screen:', error);
            // Fallback to a simple alert if something goes wrong
            alert(`Game Over! ${winner === 'player' ? 'You Win!' : 'AI Wins!'}\nScore - You: ${playerScore} | AI: ${aiScore}`);
        }
    }

    /**
     * Updates UI elements with the provided settings
     * @param {Object} settings - The settings to apply
     * @param {number} [settings.volume=0.5] - Volume level (0-1)
     * @param {string} [settings.graphicsQuality='medium'] - Graphics quality setting
     * @param {boolean} [settings.enableShadows=true] - Whether to enable shadows
     * @param {boolean} [settings.fullscreen=false] - Fullscreen mode
     * @param {string} [settings.theme='light'] - UI theme
     * @returns {boolean} Whether the settings were applied successfully
     */
    updateSettings(settings = {}) {
        try {
            if (!settings || typeof settings !== 'object') {
                throw new Error('Settings must be an object');
            }
            
            // Apply volume setting
            if (this.elements.volumeSlider) {
                const volume = Math.max(0, Math.min(1, Number(settings.volume) || 0.5));
                this.elements.volumeSlider.value = volume;
                
                // Update volume indicator if it exists
                const volumeDisplay = document.getElementById('volume-display');
                if (volumeDisplay) {
                    volumeDisplay.textContent = `${Math.round(volume * 100)}%`;
                }
            }
            
            // Apply graphics quality
            if (this.elements.graphicsQuality) {
                const validQualities = ['low', 'medium', 'high', 'ultra'];
                const quality = validQualities.includes(settings.graphicsQuality) 
                    ? settings.graphicsQuality 
                    : 'medium';
                this.elements.graphicsQuality.value = quality;
                
                // Apply quality-based classes to body
                document.body.classList.remove('quality-low', 'quality-medium', 'quality-high', 'quality-ultra');
                document.body.classList.add(`quality-${quality}`);
            }
            
            // Apply shadow setting
            if (this.elements.enableShadows) {
                const enableShadows = settings.enableShadows !== false; // Default to true
                this.elements.enableShadows.checked = enableShadows;
                
                // Toggle shadow class on body
                if (enableShadows) {
                    document.body.classList.add('shadows-enabled');
                } else {
                    document.body.classList.remove('shadows-enabled');
                }
            }
            
            // Apply fullscreen setting if needed
            if (typeof settings.fullscreen === 'boolean') {
                this.toggleFullscreen(settings.fullscreen);
            }
            
            // Apply theme if needed
            if (settings.theme) {
                this.setTheme(settings.theme);
            }
            
            // Emit settings changed event
            this.emit('settingsChanged', settings);
            
            return true;
            
        } catch (error) {
            console.error('Error updating settings:', error);
            return false;
        }
    }
    
    /**
     * Toggles fullscreen mode
     * @param {boolean} [forceState] - Force fullscreen on/off
     * @returns {Promise<boolean>} Whether fullscreen was toggled successfully
     */
    async toggleFullscreen(forceState) {
        try {
            const isFullscreen = document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.msFullscreenElement;
            
            const shouldBeFullscreen = forceState !== undefined ? forceState : !isFullscreen;
            
            if (shouldBeFullscreen === isFullscreen) {
                return true; // Already in the requested state
            }
            
            if (shouldBeFullscreen) {
                const elem = document.documentElement;
                if (elem.requestFullscreen) {
                    await elem.requestFullscreen();
                } else if (elem.webkitRequestFullscreen) {
                    await elem.webkitRequestFullscreen();
                } else if (elem.msRequestFullscreen) {
                    await elem.msRequestFullscreen();
                }
                document.body.classList.add('fullscreen');
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    await document.msExitFullscreen();
                }
                document.body.classList.remove('fullscreen');
            }
            
            return true;
            
        } catch (error) {
            console.error('Error toggling fullscreen:', error);
            return false;
        }
    }
    
    /**
     * Sets the UI theme
     * @param {string} theme - Theme name (e.g., 'light', 'dark')
     * @returns {boolean} Whether the theme was set successfully
     */
    setTheme(theme = 'light') {
        try {
            const validThemes = ['light', 'dark', 'high-contrast'];
            const newTheme = validThemes.includes(theme) ? theme : 'light';
            
            // Remove existing theme classes
            document.body.classList.remove(...validThemes.map(t => `theme-${t}`));
            
            // Add new theme class
            document.body.classList.add(`theme-${newTheme}`);
            
            // Save to localStorage for persistence
            try {
                localStorage.setItem('uiTheme', newTheme);
            } catch (e) {
                console.warn('Could not save theme to localStorage:', e);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error setting theme:', error);
            return false;
        }
    }

    /**
     * Cleans up all resources, event listeners, and references
     * @param {boolean} [removeElements=false] - Whether to remove DOM elements
     */
    dispose(removeElements = false) {
        try {
            console.log('Disposing UI Manager...');
            
            // 1. Clean up event listeners
            this.cleanup();
            
            // 2. Clear all timeouts and animation frames
            this._timeouts.forEach(clearTimeout);
            this._animationFrames.forEach(cancelAnimationFrame);
            this._timeouts = [];
            this._animationFrames = [];
            
            // 3. Remove event listeners from tracked elements
            const elementsToClean = [
                this.elements.startButton,
                this.elements.howToPlayButton,
                this.elements.settingsButton,
                this.elements.menuButton,
                this.elements.playAgainButton,
                this.elements.mainMenuButton,
                this.elements.volumeSlider,
                this.elements.graphicsQuality,
                this.elements.enableShadows,
                ...Array.from(document.querySelectorAll('.modal-close, [data-ui-event]'))
            ];
            
            elementsToClean.forEach(element => {
                if (!element) return;
                
                // Clone to remove all event listeners
                const newElement = element.cloneNode(true);
                if (element.parentNode) {
                    element.parentNode.replaceChild(newElement, element);
                }
                
                // Remove element if requested
                if (removeElements && element.parentNode) {
                    element.parentNode.removeChild(newElement);
                }
            });
            
            // 4. Clean up modal and menu state
            if (this._menuEscapeHandler) {
                document.removeEventListener('keydown', this._menuEscapeHandler);
                this._menuEscapeHandler = null;
            }
            
            // 5. Clear all event callbacks
            this._callbacks = {};
            
            // 6. Reset state
            this._initialized = false;
            this.isMenuOpen = false;
            this.isModalOpen = false;
            this._currentScreen = null;
            
            // 7. Clear element references
            if (removeElements) {
                Object.keys(this.elements).forEach(key => {
                    this.elements[key] = null;
                });
                this.elements = {};
            }
            
            console.log('UI Manager disposed successfully');
            
        } catch (error) {
            console.error('Error during UI Manager disposal:', error);
        }
    }
}

export default UIManager;
