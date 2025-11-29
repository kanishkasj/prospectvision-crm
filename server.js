const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// HubSpot API Configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY || 'YOUR_HUBSPOT_API_KEY';
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';
const USE_MOCK = process.env.USE_MOCK_DATA === 'true' || HUBSPOT_API_KEY === 'YOUR_HUBSPOT_API_KEY';

console.log('🚀 Server Mode:', USE_MOCK ? 'MOCK DATA' : 'REAL HUBSPOT API');
console.log('🔑 API Key:', HUBSPOT_API_KEY.substring(0, 15) + '...');

// Serve the widget HTML for SalesIQ
app.get('/widget', (req, res) => {
    res.sendFile(path.join(__dirname, 'widget.html'));
});

// Legacy endpoint for direct access
app.get('/hubspot-crm-widget', (req, res) => {
    res.sendFile(path.join(__dirname, 'widget.html'));
});

// SalesIQ Webhook Endpoints
app.post('/webhook/chat-started', (req, res) => {
    console.log('Chat started:', req.body);
    res.json({ status: 'success' });
});

app.post('/webhook/visitor-updated', (req, res) => {
    console.log('Visitor info updated:', req.body);
    const { visitor_info } = req.body;
    if (visitor_info && visitor_info.email) {
        console.log('Visitor email detected:', visitor_info.email);
    }
    res.json({ status: 'success' });
});

app.post('/webhook/chat-ended', (req, res) => {
    console.log('Chat ended:', req.body);
    res.json({ status: 'success' });
});

// API Routes

// Search contact by email
app.get('/api/contacts/search', async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({ error: 'Email parameter is required' });
        }

        console.log(`🔍 Searching contact: ${email}`);

        if (!USE_MOCK) {
            try {
                // Real HubSpot API call - use POST for search endpoint
                const searchData = {
                    filterGroups: [{
                        filters: [{
                            propertyName: 'email',
                            operator: 'EQ',
                            value: email
                        }]
                    }],
                    properties: [
                        'email', 'firstname', 'lastname', 'phone', 'company', 
                        'jobtitle', 'lifecyclestage', 'createdate', 'lastmodifieddate'
                    ]
                };

                const response = await axios.post(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/search`, searchData, {
                    headers: {
                        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('✅ HubSpot API response:', response.data.total, 'results');

                if (response.data.results && response.data.results.length > 0) {
                    const contact = response.data.results[0];
                    
                    // Try to get associated deals with details
                    let deals = [];
                    try {
                        const dealsAssocResponse = await axios.get(
                            `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contact.id}/associations/deals`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`
                                }
                            }
                        );
                        
                        // Fetch details for each deal
                        if (dealsAssocResponse.data.results && dealsAssocResponse.data.results.length > 0) {
                            const dealIds = dealsAssocResponse.data.results.map(d => d.id);
                            
                            for (const dealId of dealIds) {
                                try {
                                    const dealResponse = await axios.get(
                                        `${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`,
                                        {
                                            headers: {
                                                'Authorization': `Bearer ${HUBSPOT_API_KEY}`
                                            },
                                            params: {
                                                properties: 'dealname,amount,dealstage,closedate'
                                            }
                                        }
                                    );
                                    
                                    deals.push({
                                        id: dealResponse.data.id,
                                        name: dealResponse.data.properties.dealname,
                                        amount: parseFloat(dealResponse.data.properties.amount) || 0,
                                        stage: dealResponse.data.properties.dealstage,
                                        closeDate: dealResponse.data.properties.closedate
                                    });
                                } catch (dealError) {
                                    console.log(`⚠️ Error fetching deal ${dealId}:`, dealError.message);
                                }
                            }
                        }
                    } catch (dealsError) {
                        console.log('⚠️ No deals found or error fetching deals:', dealsError.message);
                    }

                    // Format contact data
                    const formattedContact = {
                        id: contact.id,
                        email: contact.properties.email,
                        firstName: contact.properties.firstname || '',
                        lastName: contact.properties.lastname || '',
                        phone: contact.properties.phone || '',
                        company: contact.properties.company || '',
                        jobTitle: contact.properties.jobtitle || '',
                        lifecycleStage: contact.properties.lifecyclestage || 'lead',
                        createDate: contact.properties.createdate,
                        lastActivity: contact.properties.lastmodifieddate,
                        deals: deals
                    };

                    console.log('✅ Contact found:', formattedContact.firstName, formattedContact.lastName);
                    return res.json(formattedContact);
                } else {
                    console.log('❌ Contact not found in HubSpot');
                    return res.status(404).json({ message: 'Contact not found' });
                }
            } catch (hubspotError) {
                console.error('❌ HubSpot API error:', hubspotError.response?.data || hubspotError.message);
                return res.status(500).json({ 
                    error: 'HubSpot API error', 
                    details: hubspotError.response?.data?.message || hubspotError.message 
                });
            }
        }

        // Mock data fallback (only if USE_MOCK is true)
        console.log('📦 Using mock data');
        const mockContacts = {
            'john.doe@example.com': {
                id: '12345',
                email: 'john.doe@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phone: '+1-555-0123',
                company: 'Acme Corporation',
                jobTitle: 'Marketing Manager',
                lifecycleStage: 'lead',
                createDate: '2024-01-15T10:00:00Z',
                lastActivity: new Date().toISOString(),
                deals: [{
                    id: 'deal1',
                    name: 'Q4 Marketing Package',
                    amount: 15000,
                    stage: 'qualification'
                }]
            }
        };

        const contact = mockContacts[email.toLowerCase()];
        if (contact) {
            res.json(contact);
        } else {
            res.status(404).json({ message: 'Contact not found' });
        }
        
    } catch (error) {
        console.error('❌ Error searching contact:', error.message);
        res.status(500).json({ error: 'Failed to search contact' });
    }
});

// Create new contact
app.post('/api/contacts', async (req, res) => {
    try {
        const { email, firstName, lastName, phone, company, jobTitle } = req.body;

        console.log(`➕ Creating new contact: ${email}`);

        if (!USE_MOCK) {
            const contactData = {
                properties: {
                    email,
                    firstname: firstName || '',
                    lastname: lastName || '',
                    phone: phone || '',
                    company: company || '',
                    jobtitle: jobTitle || '',
                    lifecyclestage: 'lead'
                }
            };

            const response = await axios.post(
                `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts`,
                contactData,
                {
                    headers: {
                        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Contact created:', response.data.id);
            return res.json({
                id: response.data.id,
                message: 'Contact created successfully'
            });
        }

        // Mock response
        console.log('📦 Mock contact created');
        res.json({
            id: 'mock-' + Date.now(),
            message: 'Contact created successfully (mock)'
        });
    } catch (error) {
        console.error('❌ Error creating contact:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create contact' });
    }
});

// Update contact
app.patch('/api/contacts/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { firstName, lastName, phone, company, jobTitle, lifecycleStage } = req.body;

        console.log(`✏️ Updating contact: ${contactId}`);

        if (!USE_MOCK) {
            const updateData = {
                properties: {}
            };

            if (firstName !== undefined) updateData.properties.firstname = firstName;
            if (lastName !== undefined) updateData.properties.lastname = lastName;
            if (phone !== undefined) updateData.properties.phone = phone;
            if (company !== undefined) updateData.properties.company = company;
            if (jobTitle !== undefined) updateData.properties.jobtitle = jobTitle;
            if (lifecycleStage !== undefined) updateData.properties.lifecyclestage = lifecycleStage;

            const response = await axios.patch(
                `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contactId}`,
                updateData,
                {
                    headers: {
                        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Contact updated successfully');
            return res.json({
                message: 'Contact updated successfully',
                contact: response.data
            });
        }

        // Mock response
        console.log('📦 Mock contact updated');
        res.json({
            message: 'Contact updated successfully (mock)',
            contact: { id: contactId }
        });
    } catch (error) {
        console.error('❌ Error updating contact:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to update contact' });
    }
});

// Create deal
app.post('/api/deals', async (req, res) => {
    try {
        const { contactId, dealName, amount, stage, closeDate } = req.body;

        console.log(`💰 Creating deal: ${dealName} for contact ${contactId}`);

        if (!USE_MOCK) {
            const dealData = {
                properties: {
                    dealname: dealName,
                    amount: amount || 0,
                    dealstage: stage || 'appointmentscheduled',
                    closedate: closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                },
                associations: [
                    {
                        to: {
                            id: contactId
                        },
                        types: [
                            {
                                associationCategory: 'HUBSPOT_DEFINED',
                                associationTypeId: 3
                            }
                        ]
                    }
                ]
            };

            const response = await axios.post(
                `${HUBSPOT_BASE_URL}/crm/v3/objects/deals`,
                dealData,
                {
                    headers: {
                        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Deal created:', response.data.id);
            return res.json({
                id: response.data.id,
                message: 'Deal created successfully'
            });
        }

        // Mock response
        console.log('📦 Mock deal created');
        res.json({
            id: 'mock-deal-' + Date.now(),
            message: 'Deal created successfully (mock)'
        });
    } catch (error) {
        console.error('❌ Error creating deal:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create deal' });
    }
});

// Get contact deals
app.get('/api/contacts/:contactId/deals', async (req, res) => {
    try {
        const { contactId } = req.params;

        const response = await axios.get(
            `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contactId}/associations/deals`,
            {
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`
                }
            }
        );

        // Get deal details for each associated deal
        const dealIds = response.data.results.map(deal => deal.id);
        const deals = [];

        for (const dealId of dealIds) {
            try {
                const dealResponse = await axios.get(
                    `${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${HUBSPOT_API_KEY}`
                        },
                        params: {
                            properties: 'dealname,amount,dealstage,closedate'
                        }
                    }
                );

                deals.push({
                    id: dealResponse.data.id,
                    name: dealResponse.data.properties.dealname,
                    amount: parseFloat(dealResponse.data.properties.amount) || 0,
                    stage: dealResponse.data.properties.dealstage,
                    closeDate: dealResponse.data.properties.closedate
                });
            } catch (dealError) {
                console.error(`Error fetching deal ${dealId}:`, dealError.message);
            }
        }

        res.json(deals);
    } catch (error) {
        console.error('Error fetching deals:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch deals' });
    }
});

// SalesIQ Integration endpoint
app.get('/api/salesiq/integration-status', (req, res) => {
    res.json({
        status: 'active',
        widget_version: '2.0.0',
        hubspot_connected: HUBSPOT_API_KEY !== 'YOUR_HUBSPOT_API_KEY',
        supported_features: [
            'contact_search',
            'lead_conversion', 
            'deal_creation',
            'contact_updates',
            'chat_integration',
            'notes_management',
            'activity_timeline',
            'quick_actions'
        ],
        timestamp: new Date().toISOString()
    });
});

// Create note for contact
app.post('/api/notes', async (req, res) => {
    try {
        const { contactId, noteBody } = req.body;

        console.log(`📝 Creating note for contact: ${contactId}`);

        if (!USE_MOCK) {
            const noteData = {
                properties: {
                    hs_timestamp: new Date().getTime(),
                    hs_note_body: noteBody
                },
                associations: [
                    {
                        to: {
                            id: contactId
                        },
                        types: [
                            {
                                associationCategory: 'HUBSPOT_DEFINED',
                                associationTypeId: 202  // Note to Contact association
                            }
                        ]
                    }
                ]
            };

            const response = await axios.post(
                `${HUBSPOT_BASE_URL}/crm/v3/objects/notes`,
                noteData,
                {
                    headers: {
                        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Note created:', response.data.id);
            return res.json({
                id: response.data.id,
                message: 'Note created successfully'
            });
        }

        // Mock response
        console.log('📦 Mock note created');
        res.json({
            id: 'mock-note-' + Date.now(),
            message: 'Note created successfully (mock)'
        });
    } catch (error) {
        console.error('❌ Error creating note:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// Get notes for contact
app.get('/api/contacts/:contactId/notes', async (req, res) => {
    try {
        const { contactId } = req.params;

        console.log(`📋 Fetching notes for contact: ${contactId}`);

        if (!USE_MOCK) {
            try {
                const notesResponse = await axios.get(
                    `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contactId}/associations/notes`,
                    {
                        headers: {
                            'Authorization': `Bearer ${HUBSPOT_API_KEY}`
                        }
                    }
                );

                const notes = [];
                if (notesResponse.data.results && notesResponse.data.results.length > 0) {
                    const noteIds = notesResponse.data.results.map(n => n.id);
                    
                    for (const noteId of noteIds) {
                        try {
                            const noteResponse = await axios.get(
                                `${HUBSPOT_BASE_URL}/crm/v3/objects/notes/${noteId}`,
                                {
                                    headers: {
                                        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
                                    },
                                    params: {
                                        properties: 'hs_note_body,hs_timestamp'
                                    }
                                }
                            );
                            
                            notes.push({
                                id: noteResponse.data.id,
                                body: noteResponse.data.properties.hs_note_body,
                                timestamp: noteResponse.data.properties.hs_timestamp
                            });
                        } catch (noteError) {
                            console.log(`⚠️ Error fetching note ${noteId}`);
                        }
                    }
                }

                return res.json(notes);
            } catch (error) {
                console.log('⚠️ No notes found');
                return res.json([]);
            }
        }

        // Mock response
        res.json([
            {
                id: 'note1',
                body: 'Customer interested in premium plan',
                timestamp: Date.now() - 86400000
            }
        ]);
    } catch (error) {
        console.error('❌ Error fetching notes:', error.message);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Get recent activities/engagements for contact
app.get('/api/contacts/:contactId/activities', async (req, res) => {
    try {
        const { contactId } = req.params;

        console.log(`⏱️ Fetching activities for contact: ${contactId}`);

        if (!USE_MOCK) {
            try {
                // Fetch notes, emails, calls, meetings
                const activities = [];

                // Get notes
                try {
                    const notesResp = await axios.get(
                        `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contactId}/associations/notes`,
                        { headers: { 'Authorization': `Bearer ${HUBSPOT_API_KEY}` }}
                    );
                    
                    for (const note of (notesResp.data.results || []).slice(0, 5)) {
                        const noteDetail = await axios.get(
                            `${HUBSPOT_BASE_URL}/crm/v3/objects/notes/${note.id}`,
                            {
                                headers: { 'Authorization': `Bearer ${HUBSPOT_API_KEY}` },
                                params: { properties: 'hs_note_body,hs_timestamp' }
                            }
                        );
                        activities.push({
                            type: 'note',
                            id: noteDetail.data.id,
                            body: noteDetail.data.properties.hs_note_body,
                            timestamp: parseInt(noteDetail.data.properties.hs_timestamp) || Date.now()
                        });
                    }
                } catch (e) { console.log('No notes'); }

                // Sort by timestamp
                activities.sort((a, b) => b.timestamp - a.timestamp);

                return res.json(activities.slice(0, 10));
            } catch (error) {
                console.log('⚠️ No activities found');
                return res.json([]);
            }
        }

        // Mock response
        res.json([
            { type: 'note', body: 'Customer called about pricing', timestamp: Date.now() - 3600000 },
            { type: 'deal', body: 'Deal created: Premium Package', timestamp: Date.now() - 7200000 }
        ]);
    } catch (error) {
        console.error('❌ Error fetching activities:', error.message);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});

// Quick action: Update contact properties
app.post('/api/contacts/:contactId/quick-action', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { action, value } = req.body;

        console.log(`⚡ Quick action: ${action} for contact ${contactId}`);

        if (!USE_MOCK) {
            const updateData = { properties: {} };

            // Map actions to HubSpot properties
            switch (action) {
                case 'mark_hot_lead':
                    // Use valid HubSpot lead status option
                    updateData.properties.hs_lead_status = 'OPEN';
                    updateData.properties.lifecyclestage = 'opportunity';
                    break;
                case 'increase_score':
                    // HubSpot lead score is calculated, but we can add a custom property
                    updateData.properties.hubspot_owner_assigneddate = new Date().toISOString();
                    break;
                case 'add_to_list':
                    // Lists are managed separately via lists API
                    return res.json({ message: 'List management requires separate API call' });
                case 'assign_owner':
                    updateData.properties.hubspot_owner_id = value;
                    break;
                default:
                    return res.status(400).json({ error: 'Unknown action' });
            }

            const response = await axios.patch(
                `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contactId}`,
                updateData,
                {
                    headers: {
                        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Quick action completed');
            return res.json({ message: `${action} completed successfully` });
        }

        // Mock response
        console.log('📦 Mock quick action completed');
        res.json({ message: `${action} completed successfully (mock)` });
    } catch (error) {
        console.error('❌ Error in quick action:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to perform quick action' });
    }
});

// Auto-log activity
app.post('/api/activities/log', async (req, res) => {
    try {
        const { contactId, activityType, description } = req.body;

        console.log(`📝 Auto-logging activity: ${activityType} for contact ${contactId}`);

        if (!USE_MOCK) {
            const noteData = {
                properties: {
                    hs_timestamp: new Date().getTime(),
                    hs_note_body: `[SalesIQ Widget] ${description}`
                },
                associations: [
                    {
                        to: { id: contactId },
                        types: [{
                            associationCategory: 'HUBSPOT_DEFINED',
                            associationTypeId: 202
                        }]
                    }
                ]
            };

            await axios.post(`${HUBSPOT_BASE_URL}/crm/v3/objects/notes`, noteData, {
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return res.json({ message: 'Activity logged successfully' });
        }

        res.json({ message: 'Activity logged (mock)' });
    } catch (error) {
        console.error('❌ Error logging activity:', error.message);
        res.status(500).json({ error: 'Failed to log activity' });
    }
});

// Create task/reminder
app.post('/api/tasks', async (req, res) => {
    try {
        const { contactId, title, dueDate, priority, notes } = req.body;

        console.log(`📅 Creating task: ${title} for contact ${contactId}`);

        if (!USE_MOCK) {
            const taskData = {
                properties: {
                    hs_task_subject: title,
                    hs_task_body: notes || '',
                    hs_task_status: 'NOT_STARTED',
                    hs_task_priority: priority || 'MEDIUM',
                    hs_timestamp: new Date(dueDate).getTime()
                },
                associations: [
                    {
                        to: { id: contactId },
                        types: [{
                            associationCategory: 'HUBSPOT_DEFINED',
                            associationTypeId: 204
                        }]
                    }
                ]
            };

            const response = await axios.post(`${HUBSPOT_BASE_URL}/crm/v3/objects/tasks`, taskData, {
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return res.json({ id: response.data.id, message: 'Task created successfully' });
        }

        res.json({ id: 'mock-task-' + Date.now(), message: 'Task created (mock)' });
    } catch (error) {
        console.error('❌ Error creating task:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Get contact owner
app.get('/api/contacts/:contactId/owner', async (req, res) => {
    try {
        const { contactId } = req.params;

        if (!USE_MOCK) {
            const response = await axios.get(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contactId}`, {
                headers: { 'Authorization': `Bearer ${HUBSPOT_API_KEY}` },
                params: { properties: 'hubspot_owner_id' }
            });

            const ownerId = response.data.properties.hubspot_owner_id;
            
            if (ownerId) {
                const ownerResponse = await axios.get(`${HUBSPOT_BASE_URL}/crm/v3/owners/${ownerId}`, {
                    headers: { 'Authorization': `Bearer ${HUBSPOT_API_KEY}` }
                });
                return res.json(ownerResponse.data);
            }
            
            return res.json({ message: 'No owner assigned' });
        }

        res.json({ firstName: 'John', lastName: 'Doe', email: 'john@example.com' });
    } catch (error) {
        console.error('❌ Error fetching owner:', error.message);
        res.status(500).json({ error: 'Failed to fetch owner' });
    }
});

// Get all owners
app.get('/api/owners', async (req, res) => {
    try {
        if (!USE_MOCK) {
            const response = await axios.get(`${HUBSPOT_BASE_URL}/crm/v3/owners`, {
                headers: { 'Authorization': `Bearer ${HUBSPOT_API_KEY}` }
            });
            return res.json(response.data.results);
        }

        res.json([{ id: '123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }]);
    } catch (error) {
        console.error('❌ Error fetching owners:', error.message);
        res.status(500).json({ error: 'Failed to fetch owners' });
    }
});

// Add tags to contact
app.post('/api/contacts/:contactId/tags', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { tags } = req.body;

        console.log(`🏷️ Adding tags to contact ${contactId}:`, tags);

        if (!USE_MOCK) {
            const updateData = {
                properties: {
                    hs_tag: tags.join(';')
                }
            };

            await axios.patch(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contactId}`, updateData, {
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return res.json({ message: 'Tags updated successfully' });
        }

        res.json({ message: 'Tags updated (mock)' });
    } catch (error) {
        console.error('❌ Error updating tags:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to update tags' });
    }
});

// Search company by domain
app.get('/api/companies/search', async (req, res) => {
    try {
        const { domain } = req.query;

        console.log(`🏢 Searching company by domain: ${domain}`);

        if (!USE_MOCK) {
            const searchData = {
                filterGroups: [{
                    filters: [{
                        propertyName: 'domain',
                        operator: 'EQ',
                        value: domain
                    }]
                }]
            };

            const response = await axios.post(`${HUBSPOT_BASE_URL}/crm/v3/objects/companies/search`, searchData, {
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.results && response.data.results.length > 0) {
                return res.json(response.data.results[0]);
            }
            
            return res.status(404).json({ message: 'Company not found' });
        }

        res.json({ id: 'mock-company', properties: { name: 'Example Corp', domain } });
    } catch (error) {
        console.error('❌ Error searching company:', error.message);
        res.status(500).json({ error: 'Failed to search company' });
    }
});

// Associate contact with company
app.post('/api/contacts/:contactId/associate-company', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { companyId } = req.body;

        console.log(`🔗 Associating contact ${contactId} with company ${companyId}`);

        if (!USE_MOCK) {
            await axios.put(
                `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contactId}/associations/companies/${companyId}/280`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return res.json({ message: 'Contact associated with company' });
        }

        res.json({ message: 'Association created (mock)' });
    } catch (error) {
        console.error('❌ Error associating company:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to associate company' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        salesiq_ready: true,
        timestamp: new Date().toISOString() 
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ProspectVision CRM Widget server running on port ${PORT}`);
    console.log(`📱 SalesIQ Widget URL: http://localhost:${PORT}/widget`);
    console.log(`🔗 Direct Access URL: http://localhost:${PORT}/hubspot-crm-widget`);
    console.log(`🔌 API Base URL: http://localhost:${PORT}/api`);
    console.log(`💡 HubSpot API: ${HUBSPOT_API_KEY !== 'YOUR_HUBSPOT_API_KEY' ? 'Connected' : 'Mock Mode'}`);
    console.log(`📋 Integration Status: http://localhost:${PORT}/api/salesiq/integration-status`);
});

module.exports = app;