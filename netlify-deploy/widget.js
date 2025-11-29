// HubSpot CRM Widget for SalesIQ Integration
class HubSpotCRMWidget {
    constructor() {
        this.baseURL = window.location.origin; // Use current domain for API calls
        this.currentContact = null;
        this.visitorInfo = null;
        this.chatContext = null;
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        // Initialize widget when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.initializeSalesIQIntegration();
            this.loadVisitorEmail();
            this.applySettings();
        });
    }

    // Load settings from localStorage
    loadSettings() {
        const defaultSettings = {
            defaultDealAmount: 1000,
            defaultDealStage: 'appointmentscheduled',
            autoRefresh: true
        };
        
        const saved = localStorage.getItem('hubspot_widget_settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    // Save settings to localStorage
    saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        localStorage.setItem('hubspot_widget_settings', JSON.stringify(this.settings));
    }

    // Apply settings to UI
    applySettings() {
        if (document.getElementById('defaultDealAmount')) {
            document.getElementById('defaultDealAmount').value = this.settings.defaultDealAmount;
            document.getElementById('defaultDealStage').value = this.settings.defaultDealStage;
            document.getElementById('autoRefresh').checked = this.settings.autoRefresh;
        }
    }

    // Initialize SalesIQ integration
    initializeSalesIQIntegration() {
        // Check if running within SalesIQ context
        if (window.parent && window.parent.ZSIQ) {
            this.setupSalesIQListeners();
        } else {
            console.log('Running in standalone mode - SalesIQ context not available');
        }
    }

    // Setup SalesIQ event listeners
    setupSalesIQListeners() {
        try {
            // Listen for visitor information updates
            window.parent.ZSIQ.visitor.info((visitorData) => {
                this.visitorInfo = visitorData;
                if (visitorData.email) {
                    document.getElementById('emailSearch').value = visitorData.email;
                    this.searchContact();
                }
            });

            // Listen for chat messages to extract email
            window.parent.ZSIQ.chat.onMessage((message) => {
                if (message.sender_type === 'visitor') {
                    this.extractEmailFromMessage(message.text);
                }
            });

            // Listen for chat context updates
            window.parent.ZSIQ.chat.getInfo((chatData) => {
                this.chatContext = chatData;
                this.updateWidgetWithChatContext();
            });

        } catch (error) {
            console.log('SalesIQ API not available:', error.message);
        }
    }

    // Extract email from chat messages
    extractEmailFromMessage(messageText) {
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
        const emails = messageText.match(emailRegex);
        if (emails && emails.length > 0) {
            const email = emails[0];
            if (email !== document.getElementById('emailSearch').value) {
                document.getElementById('emailSearch').value = email;
                this.searchContact();
            }
        }
    }

    // Update widget with chat context
    updateWidgetWithChatContext() {
        if (this.chatContext) {
            // Add chat context information to widget header
            const contextInfo = document.createElement('div');
            contextInfo.className = 'chat-context';
            contextInfo.innerHTML = `
                <small class="text-muted">
                    Chat ID: ${this.chatContext.chat_id || 'Unknown'} | 
                    Duration: ${this.formatChatDuration(this.chatContext.duration)}
                </small>
            `;
            
            const header = document.querySelector('.widget-header');
            if (header && !header.querySelector('.chat-context')) {
                header.appendChild(contextInfo);
            }
        }
    }

    // Format chat duration
    formatChatDuration(duration) {
        if (!duration) return '0:00';
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    setupEventListeners() {
        // Search on Enter key
        document.getElementById('emailInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchContact();
            }
        });

        // Deal form submission
        document.getElementById('dealForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createDeal();
        });

        // Update form submission
        document.getElementById('updateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateContact();
        });

        // Notes form submission
        document.getElementById('notesForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNote();
        });

        // Task form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTask();
        });

        // Settings form submission
        document.getElementById('settingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettingsFromForm();
        });
    }

    // Load visitor email from SalesIQ context (if available)
    loadVisitorEmail() {
        // Try to get visitor email from URL parameters (SalesIQ may pass it)
        const urlParams = new URLSearchParams(window.location.search);
        const visitorEmail = urlParams.get('visitor_email') || urlParams.get('email');
        
        if (visitorEmail) {
            document.getElementById('emailInput').value = visitorEmail;
            this.searchContact();
        }
        
        // Also check for visitor info in parent context
        if (this.visitorInfo && this.visitorInfo.email) {
            document.getElementById('emailInput').value = this.visitorInfo.email;
            this.searchContact();
        }
    }

    // Search for contact by email
    async searchContact() {
        const email = document.getElementById('emailInput').value.trim();
        if (!email) {
            this.showError('Please enter an email address');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        this.showLoading();

        try {
            // Call our backend API to search HubSpot
            const response = await fetch(`${this.baseURL}/api/contacts/search?email=${encodeURIComponent(email)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const contact = await response.json();
                this.currentContact = contact;
                await this.displayContact(contact);
                
                // Notify SalesIQ about contact found
                this.notifySalesIQ('contact_found', { email, contact });
            } else if (response.status === 404) {
                this.showNoResults(email);
                this.notifySalesIQ('contact_not_found', { email });
            } else {
                throw new Error(`API Error: ${response.status}`);
            }
        } catch (error) {
            console.error('Error searching contact:', error);
            const errorMsg = error.message || 'Unknown error';
            this.showError(`HubSpot API Error: ${errorMsg}`);
            this.hideLoading();
        }
    }

    // Notify SalesIQ about widget events
    notifySalesIQ(eventType, data) {
        try {
            if (window.parent && window.parent.postMessage) {
                window.parent.postMessage({
                    type: 'hubspot_crm_event',
                    event: eventType,
                    data: data,
                    timestamp: new Date().toISOString()
                }, '*');
            }
        } catch (error) {
            console.log('Could not notify SalesIQ:', error.message);
        }
    }

    // Display contact information
    async displayContact(contact) {
        const resultsSection = document.getElementById('results');
        
        const statusClass = this.getStatusClass(contact.lifecycleStage);
        const initials = this.getInitials(contact.firstName, contact.lastName);
        
        // Auto-fill company if email domain matches
        let companyHTML = '';
        const autoCompany = await this.autoFillCompany(contact.email);
        if (autoCompany && !contact.company) {
            // Auto-associate company
            await this.associateCompany(autoCompany.id);
            companyHTML = this.displayCompanyInfo(autoCompany);
        }
        
        // Display tags
        const tagsHTML = this.displayTags(contact.hs_tag);
        
        resultsSection.innerHTML = `
            <div class="contact-card">
                <div class="contact-header">
                    <div class="contact-avatar">${initials}</div>
                    <div class="contact-info">
                        <h6>${contact.firstName} ${contact.lastName}</h6>
                        <div class="text-muted">${contact.email}</div>
                        <span class="status-badge status-${statusClass}">${contact.lifecycleStage}</span>
                    </div>
                </div>
                
                <div class="contact-details">
                    <div class="row">
                        <div class="col-4"><strong>Phone:</strong></div>
                        <div class="col-8">${contact.phone || 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="col-4"><strong>Company:</strong></div>
                        <div class="col-8">${contact.company || 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="col-4"><strong>Job Title:</strong></div>
                        <div class="col-8">${contact.jobTitle || 'N/A'}</div>
                    </div>
                    <div class="row">
                        <div class="col-4"><strong>Created:</strong></div>
                        <div class="col-8">${this.formatDate(contact.createDate)}</div>
                    </div>
                    <div class="row">
                        <div class="col-4"><strong>Last Activity:</strong></div>
                        <div class="col-8">${this.formatDate(contact.lastActivity)}</div>
                    </div>
                </div>

                ${this.renderDeals(contact.deals)}

                ${companyHTML}
                ${tagsHTML}

                <!-- Quick Actions Section -->
                <div class="quick-actions-section">
                    <div class="section-title">
                        <span><i class="fas fa-bolt"></i> Quick Actions</span>
                    </div>
                    <button class="btn btn-warning quick-action-btn" onclick="hubspotWidget.quickAction('mark_hot_lead')">
                        <i class="fas fa-fire"></i> Mark as Hot Lead
                    </button>
                    <button class="btn btn-info quick-action-btn" onclick="showTaskModal()">
                        <i class="fas fa-tasks"></i> Create Task
                    </button>
                    <button class="btn btn-primary quick-action-btn" onclick="hubspotWidget.showNotesModal()">
                        <i class="fas fa-sticky-note"></i> Add Note
                    </button>
                    <button class="btn btn-secondary quick-action-btn" onclick="hubspotWidget.addTags()">
                        <i class="fas fa-tags"></i> Add Tags
                    </button>
                </div>

                <!-- Notes Section -->
                <div class="notes-section" id="notesSection">
                    <div class="section-title">
                        <span><i class="fas fa-sticky-note"></i> Recent Notes</span>
                        <button class="btn-link" onclick="hubspotWidget.loadNotes()">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                    <div class="notes-list" id="notesList">
                        <small class="text-muted">Loading notes...</small>
                    </div>
                </div>

                <!-- Activity Timeline Section -->
                <div class="activity-section" id="activitySection">
                    <div class="section-title">
                        <span><i class="fas fa-history"></i> Activity Timeline</span>
                        <button class="btn-link" onclick="hubspotWidget.loadActivities()">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                    <div id="activityList">
                        <small class="text-muted">Loading activities...</small>
                    </div>
                </div>

                <div class="action-buttons">
                    ${contact.lifecycleStage === 'lead' ? 
                        `<button class="btn btn-success" onclick="hubspotWidget.convertToContact()">
                            <i class="fas fa-user-check"></i> Convert to Customer
                        </button>` : ''
                    }
                    <button class="btn btn-primary" onclick="hubspotWidget.showDealModal()">
                        <i class="fas fa-plus"></i> Add Deal
                    </button>
                    <button class="btn btn-info" onclick="hubspotWidget.showUpdateModal()">
                        <i class="fas fa-edit"></i> Update Contact
                    </button>
                    <button class="btn btn-secondary" onclick="hubspotWidget.viewInHubSpot()">
                        <i class="fas fa-external-link-alt"></i> View in HubSpot
                    </button>
                </div>
            </div>
        `;

        // Load notes and activities
        this.loadNotes();
        this.loadActivities();
    }

    // Render deals section
    renderDeals(deals) {
        if (!deals || deals.length === 0) {
            return '<div class="mt-3"><small class="text-muted">No deals found</small></div>';
        }

        let dealsHtml = '<div class="mt-3"><h6 class="mb-2">Deals:</h6>';
        deals.forEach(deal => {
            dealsHtml += `
                <div class="mb-2 p-2 border rounded">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <strong>${deal.name}</strong>
                            <div class="text-muted small">$${deal.amount.toLocaleString()} • ${deal.stage}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        dealsHtml += '</div>';
        return dealsHtml;
    }

    // Show no results message with option to create new contact
    showNoResults(email) {
        const resultsSection = document.getElementById('results');
        resultsSection.innerHTML = `
            <div class="no-results">
                <i class="fas fa-user-slash"></i>
                <p>No contact found for <strong>${email}</strong></p>
                <button class="btn btn-primary" onclick="hubspotWidget.createNewContact('${email}')">
                    <i class="fas fa-user-plus"></i> Create New Contact
                </button>
            </div>
        `;
    }

    // Create new contact
    async createNewContact(email) {
        try {
            // Real API call to create contact in HubSpot
            const response = await fetch(`${this.baseURL}/api/contacts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    firstName: '',
                    lastName: '',
                    phone: '',
                    company: '',
                    jobTitle: ''
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create contact');
            }

            const result = await response.json();

            // Show success message
            this.showSuccess('New contact created successfully in HubSpot!');
            
            // Search for the newly created contact to display it
            document.getElementById('emailInput').value = email;
            await this.searchContact();
            await this.logActivity('CONTACT_CREATED', 'Contact created via SalesIQ widget');
            
            // Notify SalesIQ about the new contact
            this.notifySalesIQ({
                event: 'contact_created',
                contactId: result.id,
                email: email
            });
            
        } catch (error) {
            console.error('Error creating contact:', error);
            const errorMsg = error.message || 'Unknown error';
            this.showError(`Failed to create contact: ${errorMsg}`);
        }
    }

    // Convert lead to contact
    async convertToContact() {
        if (!this.currentContact) return;

        try {
            // Real API call to update lifecycle stage in HubSpot
            const response = await fetch(`${this.baseURL}/api/contacts/${this.currentContact.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lifecycleStage: 'customer'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to convert lead');
            }

            this.currentContact.lifecycleStage = 'customer';
            
            this.showSuccess('Lead converted to customer successfully in HubSpot!');
            this.displayContact(this.currentContact);
            
            // Notify SalesIQ about the conversion
            this.notifySalesIQ({
                event: 'lead_converted',
                contactId: this.currentContact.id,
                contactEmail: this.currentContact.email,
                newStage: 'customer'
            });
            
        } catch (error) {
            console.error('Error converting lead:', error);
            const errorMsg = error.message || 'Unknown error';
            this.showError(`Failed to convert lead: ${errorMsg}`);
        }
    }

    // Show deal creation modal
    showDealModal() {
        document.getElementById('dealModal').style.display = 'block';
        
        // Apply default settings
        document.getElementById('dealAmount').value = this.settings.defaultDealAmount;
        document.getElementById('dealStage').value = this.settings.defaultDealStage;
        
        // Set default close date to 30 days from now
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        document.getElementById('dealCloseDate').value = futureDate.toISOString().split('T')[0];
    }

    // Close deal modal
    closeDealModal() {
        document.getElementById('dealModal').style.display = 'none';
        document.getElementById('dealForm').reset();
    }

    // Create new deal
    async createDeal() {
        if (!this.currentContact) return;

        const dealName = document.getElementById('dealName').value;
        const dealAmount = parseFloat(document.getElementById('dealAmount').value) || 0;
        const dealStage = document.getElementById('dealStage').value;
        const dealCloseDate = document.getElementById('dealCloseDate').value;

        if (!dealName) {
            this.showError('Please enter a deal name');
            return;
        }

        try {
            // Real API call to create deal in HubSpot
            const response = await fetch(`${this.baseURL}/api/deals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contactId: this.currentContact.id,
                    dealName: dealName,
                    amount: dealAmount,
                    stage: dealStage,
                    closeDate: dealCloseDate
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create deal');
            }

            const result = await response.json();
            
            this.closeDealModal();
            this.showSuccess('Deal created successfully in HubSpot!');
            
            // Log activity
            await this.logActivity('DEAL_CREATED', `Created deal: ${dealName} ($${dealAmount})`);
            
            // Auto-refresh if enabled in settings
            if (this.settings.autoRefresh) {
                setTimeout(async () => {
                    document.getElementById('emailInput').value = this.currentContact.email;
                    await this.searchContact();
                }, 1000);
            }
            
            // Notify SalesIQ about the deal creation
            this.notifySalesIQ({
                event: 'deal_created',
                dealId: result.id,
                dealName: dealName,
                amount: dealAmount,
                contactEmail: this.currentContact.email
            });
            
        } catch (error) {
            console.error('Error creating deal:', error);
            const errorMsg = error.message || 'Unknown error';
            this.showError(`Failed to create deal: ${errorMsg}`);
        }
    }

    // Show update modal
    showUpdateModal() {
        if (!this.currentContact) return;

        document.getElementById('updateContactId').value = this.currentContact.id;
        document.getElementById('updateFirstName').value = this.currentContact.firstName;
        document.getElementById('updateLastName').value = this.currentContact.lastName;
        document.getElementById('updatePhone').value = this.currentContact.phone || '';
        document.getElementById('updateCompany').value = this.currentContact.company || '';
        document.getElementById('updateJobTitle').value = this.currentContact.jobTitle || '';
        
        document.getElementById('updateModal').style.display = 'block';
    }

    // Close update modal
    closeUpdateModal() {
        document.getElementById('updateModal').style.display = 'none';
        document.getElementById('updateForm').reset();
    }

    // Update contact
    async updateContact() {
        if (!this.currentContact) return;

        const firstName = document.getElementById('updateFirstName').value;
        const lastName = document.getElementById('updateLastName').value;
        const phone = document.getElementById('updatePhone').value;
        const company = document.getElementById('updateCompany').value;
        const jobTitle = document.getElementById('updateJobTitle').value;

        try {
            // Real API call to update contact in HubSpot
            const response = await fetch(`${this.baseURL}/api/contacts/${this.currentContact.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName: firstName,
                    lastName: lastName,
                    phone: phone,
                    company: company,
                    jobTitle: jobTitle
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update contact');
            }

            // Update local contact object
            this.currentContact.firstName = firstName;
            this.currentContact.lastName = lastName;
            this.currentContact.phone = phone;
            this.currentContact.company = company;
            this.currentContact.jobTitle = jobTitle;
            
            this.closeUpdateModal();
            this.showSuccess('Contact updated successfully in HubSpot!');
            
            // Log activity
            await this.logActivity('CONTACT_UPDATED', 'Contact details updated via SalesIQ widget');
            
            await this.displayContact(this.currentContact);
            
            // Notify SalesIQ about the update
            this.notifySalesIQ({
                event: 'contact_updated',
                contactId: this.currentContact.id,
                contactEmail: this.currentContact.email
            });
            
        } catch (error) {
            console.error('Error updating contact:', error);
            const errorMsg = error.message || 'Unknown error';
            this.showError(`Failed to update contact: ${errorMsg}`);
        }
    }

    // View contact in HubSpot
    viewInHubSpot() {
        if (!this.currentContact) return;
        
        // Open HubSpot contact page - user will be redirected to correct portal
        const hubspotUrl = `https://app.hubspot.com/contacts/contact/${this.currentContact.id}`;
        window.open(hubspotUrl, '_blank');
        
        this.showSuccess('Opening contact in HubSpot...');
    }

    // Utility functions
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getInitials(firstName, lastName) {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return first + last || '?';
    }

    getStatusClass(lifecycleStage) {
        switch (lifecycleStage) {
            case 'lead': return 'status-lead';
            case 'contact': return 'status-contact';
            case 'customer': return 'status-customer';
            default: return 'status-lead';
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    showLoading() {
        document.getElementById('results').innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p style="margin-top: 15px; color: var(--text-gray);">Searching contact...</p>
            </div>
        `;
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // SalesIQ Integration Methods
    
    // Add note to SalesIQ chat
    addChatNote(note) {
        try {
            if (window.parent && window.parent.ZSIQ && window.parent.ZSIQ.chat) {
                window.parent.ZSIQ.chat.addNote(note);
            }
        } catch (error) {
            console.log('Could not add chat note:', error.message);
        }
    }

    // Update visitor information in SalesIQ
    updateVisitorInfo(info) {
        try {
            if (window.parent && window.parent.ZSIQ && window.parent.ZSIQ.visitor) {
                window.parent.ZSIQ.visitor.update(info);
            }
        } catch (error) {
            console.log('Could not update visitor info:', error.message);
        }
    }

    // Send automated message to visitor
    sendAutomatedMessage(message) {
        try {
            if (window.parent && window.parent.ZSIQ && window.parent.ZSIQ.chat) {
                window.parent.ZSIQ.chat.sendMessage(message, 'operator');
            }
        } catch (error) {
            console.log('Could not send automated message:', error.message);
        }
    }

    // Notes functionality
    showNotesModal() {
        document.getElementById('notesModal').style.display = 'block';
    }

    closeNotesModal() {
        document.getElementById('notesModal').style.display = 'none';
        document.getElementById('notesForm').reset();
    }

    async saveNote() {
        if (!this.currentContact) return;

        const noteBody = document.getElementById('noteBody').value;

        try {
            const response = await fetch(`${this.baseURL}/api/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contactId: this.currentContact.id,
                    noteBody: noteBody
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save note');
            }

            this.closeNotesModal();
            this.showSuccess('Note saved successfully!');
            
            // Log activity (note creation is already logged by HubSpot)
            
            // Reload notes
            await this.loadNotes();
            
        } catch (error) {
            console.error('Error saving note:', error);
            const errorMsg = error.message || 'Unknown error';
            this.showError(`Failed to save note: ${errorMsg}`);
        }
    }

    async loadNotes() {
        if (!this.currentContact) return;

        try {
            const response = await fetch(`${this.baseURL}/api/contacts/${this.currentContact.id}/notes`);
            
            if (!response.ok) {
                throw new Error('Failed to load notes');
            }

            const notes = await response.json();
            const notesList = document.getElementById('notesList');
            
            if (notes.length === 0) {
                notesList.innerHTML = '<small class="text-muted">No notes yet</small>';
            } else {
                notesList.innerHTML = notes.map(note => `
                    <div class="note-item">
                        <div>${note.body}</div>
                        <div class="note-timestamp">${this.formatDate(note.timestamp)}</div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            document.getElementById('notesList').innerHTML = '<small class="text-danger">Failed to load notes</small>';
        }
    }

    async loadActivities() {
        if (!this.currentContact) return;

        try {
            const response = await fetch(`${this.baseURL}/api/contacts/${this.currentContact.id}/activities`);
            
            if (!response.ok) {
                throw new Error('Failed to load activities');
            }

            const activities = await response.json();
            const activityList = document.getElementById('activityList');
            
            if (activities.length === 0) {
                activityList.innerHTML = '<small class="text-muted">No recent activity</small>';
            } else {
                activityList.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-type">${activity.type}</div>
                        <div>${activity.body}</div>
                        <div class="activity-time">${this.formatTimeAgo(activity.timestamp)}</div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading activities:', error);
            document.getElementById('activityList').innerHTML = '<small class="text-danger">Failed to load activities</small>';
        }
    }

    async quickAction(action) {
        if (!this.currentContact) return;

        try {
            const response = await fetch(`${this.baseURL}/api/contacts/${this.currentContact.id}/quick-action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });

            if (!response.ok) {
                throw new Error('Failed to perform quick action');
            }

            const result = await response.json();
            this.showSuccess(result.message);
            
            // Log activity
            await this.logActivity('QUICK_ACTION', `Quick action performed: ${action}`);
            
        } catch (error) {
            console.error('Error performing quick action:', error);
            const errorMsg = error.message || 'Unknown error';
            this.showError(`Failed to perform action: ${errorMsg}`);
        }
    }

    // Settings functionality
    showSettingsModal() {
        this.applySettings();
        document.getElementById('settingsModal').style.display = 'block';
    }

    // Task/Reminder functionality
    showTaskModal() {
        if (!this.currentContact) {
            this.showError('Please select a contact first');
            return;
        }
        document.getElementById('taskModal').style.display = 'flex';
        // Set default due date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        document.getElementById('taskDueDate').value = tomorrow.toISOString().slice(0, 16);
    }

    closeTaskModal() {
        document.getElementById('taskModal').style.display = 'none';
        document.getElementById('taskForm').reset();
    }

    async createTask() {
        if (!this.currentContact) {
            this.showError('No contact selected');
            return;
        }

        const title = document.getElementById('taskTitle').value;
        const dueDate = document.getElementById('taskDueDate').value;
        const priority = document.getElementById('taskPriority').value;
        const notes = document.getElementById('taskNotes').value;

        try {
            const response = await fetch(`${this.baseURL}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactId: this.currentContact.id,
                    title,
                    dueDate: new Date(dueDate).getTime(),
                    priority,
                    notes
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Task created successfully!');
                this.closeTaskModal();
                await this.logActivity('TASK_CREATED', `Created task: ${title}`);
                if (this.settings.autoRefresh) {
                    setTimeout(() => this.loadActivities(), 1000);
                }
            } else {
                this.showError(data.message || 'Failed to create task');
            }
        } catch (error) {
            console.error('Error creating task:', error);
            this.showError('Failed to create task');
        }
    }

    // Contact tagging functionality
    async addTags() {
        if (!this.currentContact) return;

        const tags = prompt('Enter tags (comma-separated):\nExample: hot-lead, enterprise, demo-requested');
        if (!tags || tags.trim() === '') return;

        try {
            const response = await fetch(`${this.baseURL}/api/contacts/${this.currentContact.id}/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: tags.split(',').map(t => t.trim()).filter(t => t) })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Tags added successfully!');
                await this.logActivity('TAGS_UPDATED', `Tags added: ${tags}`);
                if (this.settings.autoRefresh) {
                    setTimeout(() => {
                        document.getElementById('emailInput').value = this.currentContact.email;
                        this.searchContact();
                    }, 1000);
                }
            } else {
                this.showError(data.message || 'Failed to add tags');
            }
        } catch (error) {
            console.error('Error adding tags:', error);
            this.showError('Failed to add tags');
        }
    }

    displayTags(tags) {
        if (!tags) return '';
        const tagArray = tags.split(';').filter(t => t.trim());
        if (tagArray.length === 0) return '';

        return `
            <div class="tags-section">
                <div class="section-title">
                    <span><i class="fas fa-tags"></i> Tags</span>
                    <button class="btn-link" onclick="hubspotWidget.addTags()"><i class="fas fa-plus"></i> Add Tags</button>
                </div>
                <div>
                    ${tagArray.map(tag => `<span class="tag-item"><i class="fas fa-tag"></i> ${tag.trim()}</span>`).join('')}
                </div>
            </div>
        `;
    }

    // Company auto-fill functionality
    async autoFillCompany(email) {
        if (!email) return null;

        const domain = email.split('@')[1];
        if (!domain) return null;

        try {
            const response = await fetch(`${this.baseURL}/api/companies/search?domain=${domain}`);
            const data = await response.json();

            if (data.success && data.company) {
                return data.company;
            }
            return null;
        } catch (error) {
            console.error('Error fetching company:', error);
            return null;
        }
    }

    async associateCompany(companyId) {
        if (!this.currentContact || !companyId) return;

        try {
            const response = await fetch(`${this.baseURL}/api/contacts/${this.currentContact.id}/associate-company`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Company associated successfully!');
                await this.logActivity('COMPANY_ASSOCIATED', 'Contact associated with company');
            }
        } catch (error) {
            console.error('Error associating company:', error);
        }
    }

    displayCompanyInfo(company) {
        if (!company) return '';

        return `
            <div class="owner-section">
                <div class="section-title">
                    <span><i class="fas fa-building"></i> Company</span>
                </div>
                <div class="owner-info">
                    <strong>${company.name}</strong><br>
                    ${company.domain ? `<small>${company.domain}</small><br>` : ''}
                    ${company.industry ? `<small>Industry: ${company.industry}</small>` : ''}
                </div>
            </div>
        `;
    }

    // Activity auto-logging
    async logActivity(type, description) {
        if (!this.currentContact) return;

        try {
            await fetch(`${this.baseURL}/api/activities/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactId: this.currentContact.id,
                    activityType: type,
                    description: description
                })
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    closeSettingsModal() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    saveSettingsFromForm() {
        const settings = {
            defaultDealAmount: parseFloat(document.getElementById('defaultDealAmount').value),
            defaultDealStage: document.getElementById('defaultDealStage').value,
            autoRefresh: document.getElementById('autoRefresh').checked
        };

        this.saveSettings(settings);
        this.closeSettingsModal();
        this.showSuccess('Settings saved successfully!');
    }

    formatTimeAgo(timestamp) {
        if (!timestamp) return 'just now';
        
        // Convert string timestamp to number if needed
        const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
        if (isNaN(ts)) return 'just now';
        
        const now = Date.now();
        const diff = now - ts;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }
}

// Global functions for button onclick events
window.searchContact = () => hubspotWidget.searchContact();
window.closeDealModal = () => hubspotWidget.closeDealModal();
window.closeUpdateModal = () => hubspotWidget.closeUpdateModal();
window.closeNotesModal = () => hubspotWidget.closeNotesModal();
window.closeTaskModal = () => hubspotWidget.closeTaskModal();
window.closeSettingsModal = () => hubspotWidget.closeSettingsModal();
window.showSettingsModal = () => hubspotWidget.showSettingsModal();
window.showTaskModal = () => hubspotWidget.showTaskModal();

// Initialize widget
const hubspotWidget = new HubSpotCRMWidget();

// Close modals when clicking outside
window.onclick = function(event) {
    const dealModal = document.getElementById('dealModal');
    const updateModal = document.getElementById('updateModal');
    const taskModal = document.getElementById('taskModal');
    
    if (event.target === dealModal) {
        hubspotWidget.closeDealModal();
    }
    if (event.target === updateModal) {
        hubspotWidget.closeUpdateModal();
    }
    if (event.target === taskModal) {
        hubspotWidget.closeTaskModal();
    }
}