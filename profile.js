// Profile page functionality
let currentUser = null;

function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const alertEl = document.createElement('div');
    alertEl.id = alertId;
    alertEl.className = `custom-alert alert-${type}`;
    alertEl.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="alert-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    container.appendChild(alertEl);
    
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) alert.remove();
    }, 5000);
}

function showConfirm(message, onConfirm) {
    const container = document.getElementById('alertContainer');
    const confirmId = 'confirm-' + Date.now();
    
    const confirmEl = document.createElement('div');
    confirmEl.id = confirmId;
    confirmEl.className = 'custom-alert alert-error';
    confirmEl.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <div style="display: flex; gap: 10px; margin-left: auto;">
                <button onclick="document.getElementById('${confirmId}').remove()" style="background: #30363d; border: none; color: #e4e6ea; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="confirm-${confirmId}" style="background: #ef4444; border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Confirm</button>
            </div>
        </div>
    `;
    
    container.appendChild(confirmEl);
    
    document.getElementById(`confirm-${confirmId}`).addEventListener('click', () => {
        onConfirm();
        document.getElementById(confirmId).remove();
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    currentUser = await db.getCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Navigation between sections
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.profile-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = item.dataset.section;
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show target section
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetSection).classList.add('active');
        });
    });

    // Profile picture upload
    document.getElementById('avatarInput').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            const { data, error } = await db.uploadAvatar(file, currentUser.id);
            if (error) {
                showAlert('Error uploading avatar: ' + error.message, 'error');
                return;
            }
            
            // Update profile with new avatar URL
            const { error: updateError } = await db.updateProfile(currentUser.id, {
                profile_picture_url: data.url
            });
            
            if (updateError) {
                showAlert('Error updating profile: ' + updateError.message, 'error');
                return;
            }
            
            // Update UI
            const avatar = document.querySelector('.current-avatar');
            avatar.innerHTML = `<img src="${data.url}" alt="Profile Picture">`;
        }
    });

    // Remove avatar
    document.getElementById('removeAvatar').addEventListener('click', async () => {
        const { error } = await db.removeAvatar(currentUser.id);
        if (error) {
            showAlert('Error removing avatar: ' + error.message, 'error');
            return;
        }
        
        document.querySelector('.current-avatar').innerHTML = '<i class="fas fa-user-circle"></i>';
    });

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', async () => {
        const updates = {
            display_name: document.getElementById('displayName').value,
            bio: document.getElementById('userBio').value,
            email_visible: document.getElementById('emailVisible').checked
        };
        
        const { error } = await db.updateProfile(currentUser.id, updates);
        if (error) {
            showAlert('Error saving settings: ' + error.message, 'error');
            return;
        }
        
        showAlert('Settings saved successfully!', 'success');
    });

    // Email visibility toggle
    document.getElementById('emailVisible').addEventListener('change', async (e) => {
        const { error } = await db.updateProfile(currentUser.id, {
            email_visible: e.target.checked
        });
        
        if (error) {
            showAlert('Error updating email visibility: ' + error.message, 'error');
            // Revert the toggle if update failed
            e.target.checked = !e.target.checked;
        }
    });

    // Load user data
    await loadUserData();

    // Sign out functionality
    document.getElementById('signOutBtn').addEventListener('click', async () => {
        showConfirm('Are you sure you want to sign out?', async () => {
            await db.signOut();
            window.location.href = 'index.html';
        });
    });

    // Show sign out button
    document.getElementById('signOutBtn').style.display = 'block';

    // Danger zone actions
    document.getElementById('changeUsername').addEventListener('click', () => {
        showAlert('Username change feature coming soon. Contact us for assistance.', 'info');
    });

    document.getElementById('deactivateAccount').addEventListener('click', async () => {
        showConfirm('Are you sure you want to deactivate your account?', async () => {
            const { error } = await db.deactivateAccount();
            if (error) {
                showAlert('Error deactivating account: ' + error.message, 'error');
                return;
            }
            showAlert('Account deactivated. Redirecting...', 'success');
            setTimeout(() => window.location.href = 'index.html', 2000);
        });
    });

    document.getElementById('deleteAccount').addEventListener('click', async () => {
        showConfirm('Are you sure you want to delete your account? This action cannot be undone.', () => {
            showConfirm('This will permanently delete all your data. Are you absolutely sure?', async () => {
                const { error } = await db.deleteAccount();
                if (error) {
                    showAlert('Error deleting account: ' + error.message, 'error');
                    return;
                }
                showAlert('Account deleted. Redirecting...', 'success');
                setTimeout(() => window.location.href = 'index.html', 2000);
            });
        });
    });
});

async function loadUserData() {
    // Load profile data
    const { data: profile } = await db.getProfile(currentUser.id);
    
    if (profile) {
        document.getElementById('displayName').value = profile.display_name || '';
        document.getElementById('userBio').value = profile.bio || '';
        document.getElementById('userEmail').value = currentUser.email || '';
        document.getElementById('emailVisible').checked = profile.email_visible || false;
        
        // Load profile picture
        if (profile.profile_picture_url) {
            document.querySelector('.current-avatar').innerHTML = `<img src="${profile.profile_picture_url}" alt="Profile Picture">`;
        }
    }

    // Load user posts
    const { data: posts } = await db.getPosts();
    const userPosts = posts ? posts.filter(post => post.author_id === currentUser.id) : [];
    
    document.getElementById('userPostCount').textContent = userPosts.length;
    
    if (userPosts.length > 0) {
        const postsContainer = document.getElementById('userPostsList');
        postsContainer.innerHTML = userPosts.map(post => `
            <div class="user-post-item" onclick="openPostInNewTab('${post.id}')" style="cursor: pointer;">
                <h3>${post.title}</h3>
                <p>${post.description}</p>
                <div class="post-meta">
                    <span><i class="fas fa-star"></i> ${(post.ratings?.reduce((sum, r) => sum + r.rating, 0) / (post.ratings?.length || 1) || 0).toFixed(1)} rating</span>
                    <span><i class="fas fa-comment"></i> ${post.comments?.length || 0} comments</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                ${post.file_url ? `
                    <div class="post-files">
                        <i class="fas fa-paperclip"></i> File attached
                    </div>
                ` : ''}
                <div class="post-actions">
                    <button class="btn-danger btn-small" onclick="event.stopPropagation(); deletePost('${post.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // Load user library (files from posts)
    const userFiles = userPosts.filter(post => post.file_url);
    document.getElementById('userFileCount').textContent = userFiles.length;
    
    if (userFiles.length > 0) {
        const libraryContainer = document.getElementById('userLibraryList');
        libraryContainer.innerHTML = userFiles.map(post => `
            <div class="library-item">
                <div class="file-icon">
                    <i class="fas fa-file"></i>
                </div>
                <div class="file-info">
                    <h4>File from: ${post.title}</h4>
                    <p>Post: ${post.title}</p>
                    <a href="${post.file_url}" target="_blank" class="btn-primary btn-small">Download</a>
                </div>
            </div>
        `).join('');
    }

    // Load saved posts
    const { data: savedPosts } = await db.getSavedPosts(currentUser.id);
    if (savedPosts && savedPosts.length > 0) {
        const savedContainer = document.getElementById('savedPostsList');
        savedContainer.innerHTML = savedPosts.map(saved => `
            <div class="saved-post-item" onclick="openPostInNewTab('${saved.posts.id}')" style="cursor: pointer;">
                <h3>${saved.posts.title}</h3>
                <p>${saved.posts.description}</p>
                <div class="post-meta">
                    <span>By ${saved.posts.profiles?.display_name || 'Anonymous'}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(saved.posts.created_at).toLocaleDateString()}</span>
                </div>
                <div class="post-actions">
                    <button class="btn-danger btn-small" onclick="event.stopPropagation(); removeSavedPost('${saved.posts.id}')">Remove</button>
                </div>
            </div>
        `).join('');
    }
}

async function deletePost(postId) {
    showConfirm('Are you sure you want to delete this post?', async () => {
        const { error } = await db.deletePost(postId);
        if (error) {
            showAlert('Error deleting post: ' + error.message, 'error');
            return;
        }
        await loadUserData();
        showAlert('Post deleted successfully!', 'success');
    });
}

async function removeSavedPost(postId) {
    const { error } = await db.unsavePost(currentUser.id, postId);
    if (error) {
        showAlert('Error removing saved post: ' + error.message, 'error');
        return;
    }
    await loadUserData();
    showAlert('Post removed from saved!', 'success');
}

function openPostInNewTab(postId) {
    window.open(`index.html?postId=${postId}`, '_blank');
}