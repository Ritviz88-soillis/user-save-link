import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"
import { getDatabase, ref, push, onValue, remove, update, set, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js"
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"

import { firebaseConfig } from './firebase_config.js'

// ============================================
// Firebase Initialization
// ============================================
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const database = getDatabase(app)

// ============================================
// State Management
// ============================================
let currentUser = null
let allLinks = []
let allFolders = []
let currentFilter = 'all'
let currentSort = 'newest'
let searchQuery = ''
let viewMode = 'grid'

// ============================================
// DOM Elements
// ============================================
const elements = {
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    userInfo: document.getElementById('user-info'),
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    userEmail: document.getElementById('user-email'),
    logoutBtn: document.getElementById('logout-btn'),
    foldersList: document.getElementById('folders-list'),
    addFolderBtn: document.getElementById('add-folder-btn'),
    
    // Counts
    countAll: document.getElementById('count-all'),
    countFavorites: document.getElementById('count-favorites'),
    countRecent: document.getElementById('count-recent'),
    
    // Top bar
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    exportBtn: document.getElementById('export-btn'),
    viewToggle: document.getElementById('view-toggle'),
    viewIcon: document.getElementById('view-icon'),
    
    // Add link form
    addLinkForm: document.getElementById('add-link-form'),
    inputEl: document.getElementById('input-el'),
    linkTitle: document.getElementById('link-title'),
    linkFolder: document.getElementById('link-folder'),
    linkTags: document.getElementById('link-tags'),
    linkNotes: document.getElementById('link-notes'),
    toggleAdvanced: document.getElementById('toggle-advanced'),
    advancedOptions: document.getElementById('advanced-options'),
    
    // Links display
    sectionTitle: document.getElementById('section-title'),
    sortSelect: document.getElementById('sort-select'),
    deleteBtn: document.getElementById('delete-btn'),
    linksContainer: document.getElementById('links-container'),
    emptyState: document.getElementById('empty-state'),
    loadingState: document.getElementById('loading-state'),
    
    // Theme
    themeToggle: document.getElementById('theme-toggle'),
    
    // Modals
    folderModal: document.getElementById('folder-modal'),
    folderForm: document.getElementById('folder-form'),
    folderName: document.getElementById('folder-name'),
    iconPicker: document.getElementById('icon-picker'),
    
    editModal: document.getElementById('edit-modal'),
    editForm: document.getElementById('edit-form'),
    editLinkId: document.getElementById('edit-link-id'),
    editUrl: document.getElementById('edit-url'),
    editTitle: document.getElementById('edit-title'),
    editFolder: document.getElementById('edit-folder'),
    editTags: document.getElementById('edit-tags'),
    editNotes: document.getElementById('edit-notes'),
    
    // Toast
    toastContainer: document.getElementById('toast-container')
}

// ============================================
// Authentication
// ============================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.log("No user logged in, redirecting to login page")
        window.location.replace("index.html")
        return
    }
    
    currentUser = user
    console.log("User is logged in:", user.email)
    initializeAppUI(user)
})

function initializeAppUI(user) {
    // Update user info
    elements.userName.textContent = user.displayName || 'User'
    elements.userEmail.textContent = user.email
    elements.userAvatar.textContent = (user.displayName || user.email)[0].toUpperCase()
    
    // Initialize theme
    initTheme()
    
    // Setup event listeners
    setupEventListeners()
    
    // Load data
    loadFolders(user)
    loadLinks(user)
}

// ============================================
// Theme Management
// ============================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme)
        updateThemeIcon(savedTheme)
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark')
        updateThemeIcon('dark')
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme')
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
    
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
    updateThemeIcon(newTheme)
}

function updateThemeIcon(theme) {
    const icon = elements.themeToggle.querySelector('.theme-icon')
    icon.textContent = theme === 'dark' ? '☀️' : '🌙'
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }
    
    toast.innerHTML = `
        <span>${icons[type]}</span>
        <span>${message}</span>
    `
    
    elements.toastContainer.appendChild(toast)
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse'
        setTimeout(() => toast.remove(), 300)
    }, duration)
}

// ============================================
// Data Loading
// ============================================
function loadFolders(user) {
    const foldersRef = ref(database, `users/${user.uid}/folders`)
    
    onValue(foldersRef, (snapshot) => {
        allFolders = []
        
        if (snapshot.exists()) {
            const data = snapshot.val()
            allFolders = Object.entries(data).map(([id, folder]) => ({
                id,
                ...folder
            }))
        }
        
        renderFolders()
        updateFolderSelects()
    })
}

function loadLinks(user) {
    const linksRef = ref(database, `users/${user.uid}/links`)
    
    elements.loadingState.classList.add('visible')
    
    onValue(linksRef, (snapshot) => {
        elements.loadingState.classList.remove('visible')
        allLinks = []
        
        if (snapshot.exists()) {
            const data = snapshot.val()
            allLinks = Object.entries(data).map(([id, link]) => ({
                id,
                ...link
            }))
        }
        
        updateCounts()
        renderLinks()
    })
}

// ============================================
// Rendering
// ============================================
function renderFolders() {
    if (allFolders.length === 0) {
        elements.foldersList.innerHTML = '<p class="no-folders" style="font-size: 0.8rem; color: var(--text-muted); padding: 8px;">No folders yet</p>'
        return
    }
    
    elements.foldersList.innerHTML = allFolders.map(folder => `
        <div class="folder-item">
            <button class="nav-item" data-filter="folder-${folder.id}">
                <span class="nav-icon">${folder.icon || '📁'}</span>
                <span class="nav-text">${folder.name}</span>
                <span class="nav-count">${countLinksInFolder(folder.id)}</span>
            </button>
            <button class="folder-delete" data-folder-id="${folder.id}" title="Delete folder">🗑️</button>
        </div>
    `).join('')
    
    // Add click handlers for folders
    elements.foldersList.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => handleFilterChange(btn.dataset.filter))
    })
    
    elements.foldersList.querySelectorAll('.folder-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation()
            deleteFolder(btn.dataset.folderId)
        })
    })
}

function countLinksInFolder(folderId) {
    return allLinks.filter(link => link.folderId === folderId).length
}

function updateFolderSelects() {
    const options = '<option value="">No folder</option>' + 
        allFolders.map(f => `<option value="${f.id}">${f.icon || '📁'} ${f.name}</option>`).join('')
    
    elements.linkFolder.innerHTML = options
    elements.editFolder.innerHTML = options
}

function renderLinks() {
    let filteredLinks = filterLinks()
    filteredLinks = sortLinks(filteredLinks)
    
    if (filteredLinks.length === 0) {
        elements.linksContainer.innerHTML = ''
        elements.emptyState.classList.add('visible')
        return
    }
    
    elements.emptyState.classList.remove('visible')
    
    elements.linksContainer.innerHTML = filteredLinks.map(link => `
        <article class="link-card" data-id="${link.id}">
            <div class="link-card-header">
                <h3 class="link-title">${escapeHtml(link.title || extractDomain(link.url))}</h3>
                <button class="link-favorite ${link.favorite ? 'active' : ''}" data-id="${link.id}" title="Toggle favorite">
                    ${link.favorite ? '⭐' : '☆'}
                </button>
            </div>
            
            <a href="${escapeHtml(link.url)}" class="link-url" target="_blank" rel="noopener noreferrer">
                ${escapeHtml(link.url)}
            </a>
            
            <div class="link-meta">
                ${link.folderId ? `<span class="link-folder-badge">${getFolderName(link.folderId)}</span>` : ''}
                ${(link.tags || []).map(tag => `<span class="link-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            
            ${link.notes ? `<p class="link-notes">${escapeHtml(link.notes)}</p>` : ''}
            
            <span class="link-date">Added ${formatDate(link.createdAt)}</span>
            
            <div class="link-actions">
                <button class="link-action-btn copy" data-url="${escapeHtml(link.url)}" title="Copy URL">
                    📋 Copy
                </button>
                <button class="link-action-btn edit" data-id="${link.id}" title="Edit link">
                    ✏️ Edit
                </button>
                <button class="link-action-btn delete" data-id="${link.id}" title="Delete link">
                    🗑️ Delete
                </button>
            </div>
        </article>
    `).join('')
    
    // Add event listeners to link cards
    setupLinkCardListeners()
}

function setupLinkCardListeners() {
    // Favorite buttons
    elements.linksContainer.querySelectorAll('.link-favorite').forEach(btn => {
        btn.addEventListener('click', () => toggleFavorite(btn.dataset.id))
    })
    
    // Copy buttons
    elements.linksContainer.querySelectorAll('.copy').forEach(btn => {
        btn.addEventListener('click', () => copyToClipboard(btn.dataset.url))
    })
    
    // Edit buttons
    elements.linksContainer.querySelectorAll('.edit').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id))
    })
    
    // Delete buttons
    elements.linksContainer.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', () => deleteLink(btn.dataset.id))
    })
}

function filterLinks() {
    let filtered = [...allLinks]
    
    // Apply filter
    if (currentFilter === 'favorites') {
        filtered = filtered.filter(link => link.favorite)
    } else if (currentFilter === 'recent') {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        filtered = filtered.filter(link => link.createdAt > oneWeekAgo)
    } else if (currentFilter.startsWith('folder-')) {
        const folderId = currentFilter.replace('folder-', '')
        filtered = filtered.filter(link => link.folderId === folderId)
    }
    
    // Apply search
    if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(link => 
            (link.title || '').toLowerCase().includes(query) ||
            link.url.toLowerCase().includes(query) ||
            (link.tags || []).some(tag => tag.toLowerCase().includes(query)) ||
            (link.notes || '').toLowerCase().includes(query)
        )
    }
    
    return filtered
}

function sortLinks(links) {
    const sorted = [...links]
    
    switch (currentSort) {
        case 'newest':
            return sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        case 'oldest':
            return sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        case 'alpha':
            return sorted.sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url))
        case 'alpha-desc':
            return sorted.sort((a, b) => (b.title || b.url).localeCompare(a.title || a.url))
        default:
            return sorted
    }
}

function updateCounts() {
    elements.countAll.textContent = allLinks.length
    elements.countFavorites.textContent = allLinks.filter(l => l.favorite).length
    
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    elements.countRecent.textContent = allLinks.filter(l => l.createdAt > oneWeekAgo).length
}

// ============================================
// Link Operations
// ============================================
async function addLink(e) {
    e.preventDefault()
    
    const url = elements.inputEl.value.trim()
    if (!url) {
        showToast('Please enter a URL', 'warning')
        return
    }
    
    // Validate URL
    if (!isValidUrl(url)) {
        showToast('Please enter a valid URL', 'error')
        return
    }
    
    const linkData = {
        url: url.startsWith('http') ? url : `https://${url}`,
        title: elements.linkTitle.value.trim() || null,
        folderId: elements.linkFolder.value || null,
        tags: elements.linkTags.value.split(',').map(t => t.trim()).filter(t => t),
        notes: elements.linkNotes.value.trim() || null,
        favorite: false,
        createdAt: Date.now()
    }
    
    try {
        const linksRef = ref(database, `users/${currentUser.uid}/links`)
        await push(linksRef, linkData)
        
        // Clear form
        elements.addLinkForm.reset()
        elements.advancedOptions.classList.remove('visible')
        elements.toggleAdvanced.classList.remove('active')
        
        showToast('Link added successfully!', 'success')
    } catch (error) {
        console.error('Error adding link:', error)
        showToast('Failed to add link', 'error')
    }
}

async function deleteLink(linkId) {
    if (!confirm('Are you sure you want to delete this link?')) return
    
    try {
        const linkRef = ref(database, `users/${currentUser.uid}/links/${linkId}`)
        await remove(linkRef)
        showToast('Link deleted', 'success')
    } catch (error) {
        console.error('Error deleting link:', error)
        showToast('Failed to delete link', 'error')
    }
}

async function deleteAllLinks() {
    if (!confirm('Are you sure you want to delete ALL links? This cannot be undone!')) return
    
    try {
        const linksRef = ref(database, `users/${currentUser.uid}/links`)
        await remove(linksRef)
        showToast('All links deleted', 'success')
    } catch (error) {
        console.error('Error deleting all links:', error)
        showToast('Failed to delete links', 'error')
    }
}

async function toggleFavorite(linkId) {
    const link = allLinks.find(l => l.id === linkId)
    if (!link) return
    
    try {
        const linkRef = ref(database, `users/${currentUser.uid}/links/${linkId}`)
        await update(linkRef, { favorite: !link.favorite })
        showToast(link.favorite ? 'Removed from favorites' : 'Added to favorites', 'success')
    } catch (error) {
        console.error('Error toggling favorite:', error)
        showToast('Failed to update favorite', 'error')
    }
}

async function updateLink(e) {
    e.preventDefault()
    
    const linkId = elements.editLinkId.value
    
    const updatedData = {
        url: elements.editUrl.value.trim(),
        title: elements.editTitle.value.trim() || null,
        folderId: elements.editFolder.value || null,
        tags: elements.editTags.value.split(',').map(t => t.trim()).filter(t => t),
        notes: elements.editNotes.value.trim() || null
    }
    
    try {
        const linkRef = ref(database, `users/${currentUser.uid}/links/${linkId}`)
        await update(linkRef, updatedData)
        
        closeModal(elements.editModal)
        showToast('Link updated successfully!', 'success')
    } catch (error) {
        console.error('Error updating link:', error)
        showToast('Failed to update link', 'error')
    }
}

// ============================================
// Folder Operations
// ============================================
async function createFolder(e) {
    e.preventDefault()
    
    const name = elements.folderName.value.trim()
    if (!name) {
        showToast('Please enter a folder name', 'warning')
        return
    }
    
    const selectedIcon = elements.iconPicker.querySelector('.icon-option.selected')
    const icon = selectedIcon ? selectedIcon.dataset.icon : '📁'
    
    try {
        const foldersRef = ref(database, `users/${currentUser.uid}/folders`)
        await push(foldersRef, { name, icon, createdAt: Date.now() })
        
        closeModal(elements.folderModal)
        elements.folderForm.reset()
        showToast('Folder created!', 'success')
    } catch (error) {
        console.error('Error creating folder:', error)
        showToast('Failed to create folder', 'error')
    }
}

async function deleteFolder(folderId) {
    if (!confirm('Delete this folder? Links in this folder will be moved to "No folder".')) return
    
    try {
        // Remove folder assignment from links
        const linksInFolder = allLinks.filter(l => l.folderId === folderId)
        for (const link of linksInFolder) {
            const linkRef = ref(database, `users/${currentUser.uid}/links/${link.id}`)
            await update(linkRef, { folderId: null })
        }
        
        // Delete folder
        const folderRef = ref(database, `users/${currentUser.uid}/folders/${folderId}`)
        await remove(folderRef)
        
        // Reset filter if current filter is the deleted folder
        if (currentFilter === `folder-${folderId}`) {
            handleFilterChange('all')
        }
        
        showToast('Folder deleted', 'success')
    } catch (error) {
        console.error('Error deleting folder:', error)
        showToast('Failed to delete folder', 'error')
    }
}

// ============================================
// Export
// ============================================
function exportLinks() {
    if (allLinks.length === 0) {
        showToast('No links to export', 'warning')
        return
    }
    
    const exportData = {
        exportDate: new Date().toISOString(),
        totalLinks: allLinks.length,
        links: allLinks.map(link => ({
            url: link.url,
            title: link.title,
            folder: getFolderName(link.folderId),
            tags: link.tags || [],
            notes: link.notes,
            favorite: link.favorite,
            createdAt: new Date(link.createdAt).toISOString()
        }))
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    
    URL.revokeObjectURL(url)
    showToast('Links exported successfully!', 'success')
}

// ============================================
// UI Helpers
// ============================================
function handleFilterChange(filter) {
    currentFilter = filter
    
    // Update active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active')
        if (item.dataset.filter === filter) {
            item.classList.add('active')
        }
    })
    
    // Update section title
    const titles = {
        'all': 'All Links',
        'favorites': 'Favorites',
        'recent': 'Recent (Last 7 days)'
    }
    
    if (filter.startsWith('folder-')) {
        const folderId = filter.replace('folder-', '')
        const folder = allFolders.find(f => f.id === folderId)
        elements.sectionTitle.textContent = folder ? `${folder.icon} ${folder.name}` : 'Folder'
    } else {
        elements.sectionTitle.textContent = titles[filter] || 'All Links'
    }
    
    renderLinks()
}

function openEditModal(linkId) {
    const link = allLinks.find(l => l.id === linkId)
    if (!link) return
    
    elements.editLinkId.value = linkId
    elements.editUrl.value = link.url
    elements.editTitle.value = link.title || ''
    elements.editFolder.value = link.folderId || ''
    elements.editTags.value = (link.tags || []).join(', ')
    elements.editNotes.value = link.notes || ''
    
    elements.editModal.classList.add('visible')
}

function closeModal(modal) {
    modal.classList.remove('visible')
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('URL copied to clipboard!', 'success')
    }).catch(() => {
        showToast('Failed to copy', 'error')
    })
}

function toggleView() {
    viewMode = viewMode === 'grid' ? 'list' : 'grid'
    elements.linksContainer.classList.toggle('grid-view', viewMode === 'grid')
    elements.linksContainer.classList.toggle('list-view', viewMode === 'list')
    elements.viewIcon.textContent = viewMode === 'grid' ? '📊' : '📋'
}

// ============================================
// Utility Functions
// ============================================
function isValidUrl(string) {
    try {
        new URL(string.startsWith('http') ? string : `https://${string}`)
        return true
    } catch (_) {
        return false
    }
}

function extractDomain(url) {
    try {
        const hostname = new URL(url).hostname
        return hostname.replace('www.', '')
    } catch {
        return url
    }
}

function getFolderName(folderId) {
    if (!folderId) return ''
    const folder = allFolders.find(f => f.id === folderId)
    return folder ? `${folder.icon} ${folder.name}` : ''
}

function formatDate(timestamp) {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    
    return date.toLocaleDateString()
}

function escapeHtml(text) {
    if (!text) return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

// ============================================
// Event Listeners Setup
// ============================================
function setupEventListeners() {
    // Logout
    elements.logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth)
            window.location.replace('index.html')
        } catch (error) {
            console.error('Logout error:', error)
            showToast('Failed to logout', 'error')
        }
    })
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme)
    
    // Sidebar toggle (mobile)
    elements.sidebarToggle?.addEventListener('click', () => {
        elements.sidebar.classList.toggle('open')
    })
    
    // Quick access filters
    document.querySelectorAll('.nav-item[data-filter]').forEach(item => {
        item.addEventListener('click', () => handleFilterChange(item.dataset.filter))
    })
    
    // Add link form
    elements.addLinkForm.addEventListener('submit', addLink)
    
    // Toggle advanced options
    elements.toggleAdvanced.addEventListener('click', () => {
        elements.advancedOptions.classList.toggle('visible')
        elements.toggleAdvanced.classList.toggle('active')
    })
    
    // Search
    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value
        elements.clearSearch.classList.toggle('visible', searchQuery.length > 0)
        renderLinks()
    })
    
    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = ''
        searchQuery = ''
        elements.clearSearch.classList.remove('visible')
        renderLinks()
    })
    
    // Sort
    elements.sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value
        renderLinks()
    })
    
    // Delete all (double click)
    elements.deleteBtn.addEventListener('dblclick', deleteAllLinks)
    
    // View toggle
    elements.viewToggle.addEventListener('click', toggleView)
    
    // Export
    elements.exportBtn.addEventListener('click', exportLinks)
    
    // Add folder modal
    elements.addFolderBtn.addEventListener('click', () => {
        elements.folderModal.classList.add('visible')
    })
    
    elements.folderForm.addEventListener('submit', createFolder)
    
    // Icon picker
    elements.iconPicker.querySelectorAll('.icon-option').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.iconPicker.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'))
            btn.classList.add('selected')
        })
    })
    
    // Edit form
    elements.editForm.addEventListener('submit', updateLink)
    
    // Modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal')
            closeModal(modal)
        })
    })
    
    // Close modal on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal)
        })
    })
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.visible').forEach(closeModal)
        }
        
        // Ctrl+K to focus search
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault()
            elements.searchInput.focus()
        }
    })
}

