class VNHub {
    constructor() {
        this.posts = [];
        this.currentPostId = null;
        this.currentSort = 'recent';
        this.currentCategory = 'all';
        this.currentUser = null;
        this.savedPosts = [];
        this.init();
    }

    showAlert(message, type = 'info') {
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

    async init() {
        this.setupEventListeners();
        await this.checkAuthStatus();
        await this.loadPosts();
        await this.loadSavedPosts();
        this.renderPosts();
        this.updateStats();
        this.checkForPostId();
    }

    setupEventListeners() {
        // Create post modal
        document.getElementById('createPostBtn').addEventListener('click', () => {
            document.getElementById('createModal').style.display = 'block';
        });

        document.getElementById('closeCreate').addEventListener('click', () => {
            document.getElementById('createModal').style.display = 'none';
        });

        document.getElementById('closePost').addEventListener('click', () => {
            document.getElementById('postModal').style.display = 'none';
        });

        document.getElementById('closeUserProfile').addEventListener('click', () => {
            document.getElementById('userProfileModal').style.display = 'none';
        });

        // Mobile search and filter
        document.getElementById('mobileFilterBtn').addEventListener('click', () => {
            document.getElementById('mobileFilterModal').style.display = 'block';
        });

        document.getElementById('closeMobileFilter').addEventListener('click', () => {
            document.getElementById('mobileFilterModal').style.display = 'none';
        });

        // Mobile search input
        document.getElementById('mobileSearchInput').addEventListener('input', (e) => {
            this.searchPosts(e.target.value);
        });

        // Authentication
        document.getElementById('signInBtn').addEventListener('click', () => {
            document.getElementById('signInModal').style.display = 'block';
        });

        document.getElementById('closeSignIn').addEventListener('click', () => {
            document.getElementById('signInModal').style.display = 'none';
        });

        document.getElementById('closeSignUp').addEventListener('click', () => {
            document.getElementById('signUpModal').style.display = 'none';
        });

        document.getElementById('switchToSignUp').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('signInModal').style.display = 'none';
            document.getElementById('signUpModal').style.display = 'block';
        });

        document.getElementById('switchToSignIn').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('signUpModal').style.display = 'none';
            document.getElementById('signInModal').style.display = 'block';
        });

        document.getElementById('signInForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.signIn();
        });

        document.getElementById('signUpForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.signUp();
        });

        // Mobile sort buttons
        document.querySelectorAll('.mobile-sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.mobile-sort-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.currentSort = btn.dataset.sort;
                this.renderPosts();
                document.getElementById('mobileFilterModal').style.display = 'none';
            });
        });

        // Mobile category buttons
        document.querySelectorAll('.mobile-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.mobile-category-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                this.renderPosts();
                document.getElementById('mobileFilterModal').style.display = 'none';
            });
        });

        // Create form
        document.getElementById('createForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createPost();
        });

        // File upload area
        const uploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#00d4ff';
            uploadArea.style.background = 'rgba(0, 212, 255, 0.05)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#30363d';
            uploadArea.style.background = 'transparent';
        });

        uploadArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#30363d';
            uploadArea.style.background = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const processedFile = await this.processFile(files[0]);
                if (processedFile) {
                    // Store processed file for later use
                    this.selectedFile = processedFile;
                    this.updateUploadArea(processedFile);
                }
            }
        });

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const processedFile = await this.processFile(file);
                if (processedFile) {
                    // Store processed file for later use
                    this.selectedFile = processedFile;
                    this.updateUploadArea(processedFile);
                }
            }
        });

        // Sort buttons
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.sort-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.currentSort = btn.dataset.sort;
                this.renderPosts();
            });
        });

        // Category buttons
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelector('.category-item.active').classList.remove('active');
                item.classList.add('active');
                this.currentCategory = item.dataset.category;
                this.renderPosts();
            });
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchPosts(e.target.value);
        });

        // Modal clicks
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Mention clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mention')) {
                e.stopPropagation();
                const username = e.target.dataset.username;
                this.openUserProfile(username);
            }
        });
    }

    async checkAuthStatus() {
        try {
            this.currentUser = await db.getCurrentUser();
            if (this.currentUser) {
                document.getElementById('signInBtn').style.display = 'none';
                const userAvatarEl = document.getElementById('userAvatar');
                userAvatarEl.style.display = 'flex';
                
                // Load user profile picture
                const { data: profile } = await db.getProfile(this.currentUser.id);
                if (profile?.profile_picture_url) {
                    userAvatarEl.innerHTML = `<img src="${profile.profile_picture_url}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                }
            }
        } catch (error) {
            console.log('Auth check failed:', error);
        }
    }

    async loadPosts() {
        try {
            const { data, error } = await db.getPosts();
            if (!error && data) {
                this.posts = data;
                this.renderPosts();
            }
        } catch (error) {
            console.log('Load posts failed:', error);
            this.posts = [];
            this.renderPosts();
        }
    }

    async loadSavedPosts() {
        if (this.currentUser) {
            const { data, error } = await db.getSavedPosts(this.currentUser.id);
            if (!error && data) {
                this.savedPosts = data.map(item => item.post_id);
            }
        } else {
            this.savedPosts = [];
        }
    }

    async signIn() {
        const email = document.getElementById('signInEmailUsername').value;
        const password = document.getElementById('signInPassword').value;
        
        const { data, error } = await db.signIn(email, password);
        
        if (error) {
            this.showAlert('Invalid email or password', 'error');
        } else {
            this.currentUser = data.user;
            await this.loadSavedPosts();
            document.getElementById('signInModal').style.display = 'none';
            document.getElementById('signInBtn').style.display = 'none';
            document.getElementById('userAvatar').style.display = 'flex';
            this.renderPosts();
            this.showAlert('Welcome back!', 'success');
        }
    }

    async signUp() {
        const name = document.getElementById('signUpName').value;
        const email = document.getElementById('signUpEmail').value;
        const username = document.getElementById('signUpUsername').value;
        const password = document.getElementById('signUpPassword').value;
        const confirmPassword = document.getElementById('signUpConfirmPassword').value;
        
        if (password !== confirmPassword) {
            this.showAlert('Passwords do not match!', 'error');
            return;
        }
        
        const { data, error } = await db.signUp(email, password, username, name);
        
        if (error) {
            this.showAlert(error.message, 'error');
        } else {
            this.showAlert('Account created successfully! Please check your email to verify your account.', 'success');
            document.getElementById('signUpModal').style.display = 'none';
        }
    }

    async createPost() {
        if (!this.currentUser) {
            document.getElementById('signInModal').style.display = 'block';
            return;
        }

        const title = document.getElementById('postTitle').value;
        const description = document.getElementById('postDescription').value;
        const tags = document.getElementById('postTags').value;
        const fileInputElement = document.getElementById('fileInput');

        const post = {
            title,
            description,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            author_id: this.currentUser.id
        };

        const file = this.selectedFile || fileInputElement?.files?.[0] || null;
        console.log('File selected:', file ? file.name : 'No file');
        console.log('Selected file from storage:', this.selectedFile);
        console.log('File input files:', fileInputElement?.files);
        
        const { data, error } = await db.createPost(post, file);
        
        if (error) {
            this.showAlert('Failed to create post: ' + error.message, 'error');
        } else {
            await this.loadPosts();
            this.resetCreateForm();
            document.getElementById('createModal').style.display = 'none';
        }
    }

    renderPosts() {
        const container = document.getElementById('postsContainer');
        let filteredPosts = this.filterPosts();
        
        if (filteredPosts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No posts yet</h3>
                    <p>Be the first to share something with the community!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredPosts.map(post => `
            <div class="post-card" onclick="vnHub.openPost(${post.id})">
                <div class="post-header">
                    <div class="post-avatar" onclick="event.stopPropagation(); vnHub.openUserProfile('${post.profiles?.username}')">
                        ${post.profiles?.profile_picture_url ? 
                            `<img src="${post.profiles.profile_picture_url}" alt="Avatar">` : 
                            '<i class="fas fa-user"></i>'
                        }
                    </div>
                    <div class="post-meta">
                        <div class="post-author" onclick="event.stopPropagation(); vnHub.openUserProfile('${post.profiles?.username}')">${post.profiles?.display_name || 'Anonymous'} (${post.profiles?.username || 'user'})</div>
                        <div class="post-time">${this.formatTime(post.created_at)}</div>
                    </div>
                </div>
                
                <div class="post-title">
                    ${post.pinned ? '<i class="fas fa-thumbtack pin-icon"></i>' : ''}
                    ${post.title}
                </div>
                <div class="post-description">
                    ${this.parseMentions(post.description.length > 150 ? post.description.substring(0, 150) + '...' : post.description)}
                </div>
                ${post.description.length > 150 ? '<div class="description-toggle" onclick="event.stopPropagation(); const desc = this.previousElementSibling; desc.innerHTML = \`' + this.parseMentions(post.description).replace(/`/g, '\\`') + '\`; this.style.display = \'none\';">...more</div>' : ''}
                
                ${post.file_url ? this.renderFilePreview({
                    name: post.file_name,
                    size: post.file_size,
                    type: post.file_type,
                    data: post.file_url
                }) : ''}
                
                <div class="post-actions">
                    <button class="action-btn">
                        <i class="fas fa-star"></i>
                        ${(post.ratings && post.ratings.length > 0 ? (post.ratings.reduce((sum, r) => sum + r.rating, 0) / post.ratings.length).toFixed(1) : '0.0')} (${post.ratings?.length || 0})
                    </button>
                    <button class="action-btn">
                        <i class="fas fa-comment"></i>
                        ${post.comments?.length || 0}
                    </button>
                    <button class="action-btn save-btn" onclick="event.stopPropagation(); vnHub.toggleSavePost(${post.id}, this)">
                        <i class="${this.isPostSaved(post.id) ? 'fas' : 'far'} fa-bookmark"></i>
                        ${this.isPostSaved(post.id) ? 'Saved' : 'Save'}
                    </button>
                    <button class="action-btn">
                        <i class="fas fa-share"></i>
                        Share
                    </button>
                </div>
            </div>
        `).join('');
    }

    filterPosts() {
        let filtered = [...this.posts];

        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(post => {
                if (!post.file_type) return this.currentCategory === 'other';
                const type = post.file_type;
                switch (this.currentCategory) {
                    case 'documents': return type.includes('pdf') || type.includes('doc') || type.includes('text');
                    case 'images': return type.startsWith('image/');
                    case 'videos': return type.startsWith('video/');
                    case 'code': return type.includes('javascript') || type.includes('python') || type.includes('json');
                    default: return true;
                }
            });
        }

        switch (this.currentSort) {
            case 'popular':
                filtered.sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    return (b.average_rating || 0) - (a.average_rating || 0);
                });
                break;
            case 'trending':
                filtered.sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    return ((b.ratings?.length || 0) + (b.comments?.length || 0)) - ((a.ratings?.length || 0) + (a.comments?.length || 0));
                });
                break;
            default:
                filtered.sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    return new Date(b.created_at) - new Date(a.created_at);
                });
        }

        return filtered;
    }

    searchPosts(query) {
        if (!query.trim()) {
            this.renderPosts();
            return;
        }

        const container = document.getElementById('postsContainer');
        const lowerQuery = query.toLowerCase();
        
        let filtered = [];
        
        // Check if searching for user with @ symbol
        if (query.startsWith('@')) {
            const username = query.substring(1).toLowerCase();
            filtered = this.posts.filter(post => 
                post.profiles?.username?.toLowerCase().includes(username) ||
                post.profiles?.display_name?.toLowerCase().includes(username)
            );
        } else {
            // Regular search
            filtered = this.posts.filter(post => 
                post.title.toLowerCase().includes(lowerQuery) ||
                post.description.toLowerCase().includes(lowerQuery) ||
                (post.tags && post.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
                (post.file_name && post.file_name.toLowerCase().includes(lowerQuery)) ||
                post.profiles?.display_name?.toLowerCase().includes(lowerQuery)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No results found</h3>
                    <p>Try different keywords or browse categories. Use @username to search for users.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(post => `
            <div class="post-card" onclick="vnHub.openPost(${post.id})">
                <div class="post-header">
                    <div class="post-avatar" onclick="event.stopPropagation(); vnHub.openUserProfile('${post.profiles?.username}')">
                        ${post.profiles?.profile_picture_url ? 
                            `<img src="${post.profiles.profile_picture_url}" alt="Avatar">` : 
                            '<i class="fas fa-user"></i>'
                        }
                    </div>
                    <div class="post-meta">
                        <div class="post-author" onclick="event.stopPropagation(); vnHub.openUserProfile('${post.profiles?.username}')">${post.profiles?.display_name || 'Anonymous'} (${post.profiles?.username || 'user'})</div>
                        <div class="post-time">${this.formatTime(post.created_at)}</div>
                    </div>
                </div>
                
                <div class="post-title">${post.title}</div>
                <div class="post-description">
                    ${this.parseMentions(post.description.length > 150 ? post.description.substring(0, 150) + '...' : post.description)}
                </div>
                ${post.description.length > 150 ? '<div class="description-toggle" onclick="event.stopPropagation(); const desc = this.previousElementSibling; desc.innerHTML = \`' + this.parseMentions(post.description).replace(/`/g, '\\`') + '\`; this.style.display = \'none\';">...more</div>' : ''}
                
                ${post.file_url ? this.renderFilePreview({
                    name: post.file_name,
                    size: post.file_size,
                    type: post.file_type,
                    data: post.file_url
                }) : ''}
                
                <div class="post-actions">
                    <button class="action-btn">
                        <i class="fas fa-star"></i>
                        ${(post.ratings && post.ratings.length > 0 ? (post.ratings.reduce((sum, r) => sum + r.rating, 0) / post.ratings.length).toFixed(1) : '0.0')} (${post.ratings?.length || 0})
                    </button>
                    <button class="action-btn">
                        <i class="fas fa-comment"></i>
                        ${post.comments?.length || 0}
                    </button>
                    <button class="action-btn save-btn" onclick="event.stopPropagation(); vnHub.toggleSavePost(${post.id}, this)">
                        <i class="${this.isPostSaved(post.id) ? 'fas' : 'far'} fa-bookmark"></i>
                        ${this.isPostSaved(post.id) ? 'Saved' : 'Save'}
                    </button>
                    <button class="action-btn">
                        <i class="fas fa-share"></i>
                        Share
                    </button>
                </div>
            </div>
        `).join('');
    }

    async openPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        this.currentPostId = postId;
        const modal = document.getElementById('postModal');
        const content = document.getElementById('postModalContent');

        // Load comments
        const { data: comments } = await db.getComments(postId);

        content.innerHTML = `
            <div class="post-detail">
                <div class="post-detail-header">
                    <div class="post-detail-avatar" onclick="vnHub.openUserProfile('${post.profiles?.username}')">
                        ${post.profiles?.profile_picture_url ? 
                            `<img src="${post.profiles.profile_picture_url}" alt="Avatar">` : 
                            '<i class="fas fa-user"></i>'
                        }
                    </div>
                    <div>
                        <div class="post-author" onclick="vnHub.openUserProfile('${post.profiles?.username}')">${post.profiles?.display_name || 'Anonymous'} (${post.profiles?.username || 'user'})</div>
                        <div class="post-time">${this.formatTime(post.created_at)}</div>
                    </div>
                </div>
                
                <h1 class="post-detail-title">${post.title}</h1>
                <p class="post-detail-description">${this.parseMentions(post.description)}</p>
                
                ${post.file_url ? this.renderFilePreview({
                    name: post.file_name,
                    size: post.file_size,
                    type: post.file_type,
                    data: post.file_url
                }, true) : ''}
                
                <div class="rating-section">
                    <h3>Rate this post</h3>
                    <div class="rating-input" id="ratingInput">
                        ${[1,2,3,4,5].map(i => `<button class="star-btn" data-rating="${i}"><i class="far fa-star"></i></button>`).join('')}
                    </div>
                    <div class="rating-display">
                        <span class="rating-stars">${this.renderStars(post.ratings && post.ratings.length > 0 ? post.ratings.reduce((sum, r) => sum + r.rating, 0) / post.ratings.length : 0)}</span>
                        <span>${(post.ratings && post.ratings.length > 0 ? (post.ratings.reduce((sum, r) => sum + r.rating, 0) / post.ratings.length).toFixed(1) : '0.0')} (${post.ratings?.length || 0} ratings)</span>
                    </div>
                </div>
                
                <div class="comments-section">
                    <h3>Comments (${comments?.length || 0})</h3>
                    <div class="comment-form">
                        <input type="text" class="comment-input" placeholder="Add a comment..." id="commentInput">
                        <button class="btn-primary" onclick="vnHub.addComment()">Post</button>
                    </div>
                    <div class="comments-list">
                        ${comments?.map(comment => `
                            <div class="comment">
                                <div class="comment-author">${comment.profiles?.display_name || 'Anonymous'}</div>
                                <div class="comment-text">${comment.text}</div>
                                <div class="comment-time">${this.formatTime(comment.created_at)}</div>
                            </div>
                        `).join('') || ''}
                    </div>
                </div>
            </div>
        `;

        // Setup rating stars
        const starBtns = content.querySelectorAll('.star-btn');
        starBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const rating = parseInt(btn.dataset.rating);
                this.addRating(rating);
            });

            btn.addEventListener('mouseenter', () => {
                const rating = parseInt(btn.dataset.rating);
                this.highlightStars(rating);
            });
        });

        const ratingInput = document.getElementById('ratingInput');
        ratingInput.addEventListener('mouseleave', () => {
            this.resetStars();
        });

        modal.style.display = 'block';
    }

    async addRating(rating) {
        if (!this.currentUser) {
            document.getElementById('signInModal').style.display = 'block';
            return;
        }

        const { error } = await db.createRating({
            post_id: this.currentPostId,
            user_id: this.currentUser.id,
            rating: rating
        });

        if (!error) {
            await this.loadPosts();
            this.openPost(this.currentPostId);
        }
    }

    async addComment() {
        if (!this.currentUser) {
            document.getElementById('signInModal').style.display = 'block';
            return;
        }

        const commentInput = document.getElementById('commentInput');
        const text = commentInput.value.trim();
        
        if (!text) return;

        const { error } = await db.createComment({
            post_id: this.currentPostId,
            user_id: this.currentUser.id,
            text: text
        });

        if (!error) {
            commentInput.value = '';
            this.openPost(this.currentPostId);
        }
    }

    async toggleSavePost(postId, button) {
        if (!this.currentUser) {
            document.getElementById('signInModal').style.display = 'block';
            return;
        }

        const isSaved = this.isPostSaved(postId);
        
        if (isSaved) {
            const { error } = await db.unsavePost(this.currentUser.id, postId);
            if (!error) {
                this.savedPosts = this.savedPosts.filter(id => id !== postId);
                button.innerHTML = '<i class="far fa-bookmark"></i> Save';
                button.classList.remove('saved');
            }
        } else {
            const { error } = await db.savePost(this.currentUser.id, postId);
            if (!error) {
                this.savedPosts.push(postId);
                button.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
                button.classList.add('saved');
            }
        }
    }

    isPostSaved(postId) {
        return this.savedPosts.includes(postId);
    }

    async openUserProfile(username) {
        if (!username) return;
        
        // Find user by username from posts data
        const userPost = this.posts.find(post => post.profiles?.username === username);
        if (!userPost || !userPost.profiles?.id) return;
        
        const userProfile = userPost.profiles;
        const userPosts = this.posts.filter(post => post.profiles?.username === username);
        
        // Get full profile data to check email visibility and get bio
        const { data: fullProfile } = await db.getProfile(userProfile.id);
        
        // Get user's email if they have email visibility enabled
        let userEmail = null;
        if (fullProfile?.email_visible) {
            const { data: emailData } = await db.getUserEmail(userProfile.id);
            userEmail = emailData;
        }
        
        const modal = document.getElementById('userProfileModal');
        const content = document.getElementById('userProfileContent');
        
        content.innerHTML = `
            <div class="user-profile-detail">
                <div class="profile-header">
                    <div class="profile-avatar-large">
                        ${userProfile?.profile_picture_url ? 
                            `<img src="${userProfile.profile_picture_url}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                            '<i class="fas fa-user"></i>'
                        }
                    </div>
                    <div class="profile-info">
                        <h2>${userProfile?.display_name || 'Anonymous User'}</h2>
                        <p class="profile-username">@${userProfile?.username || 'user'}</p>
                        ${fullProfile?.bio ? `<p class="profile-bio">${fullProfile.bio}</p>` : ''}
                        ${fullProfile?.email_visible && userEmail ? `<p class="profile-email"><i class="fas fa-envelope"></i> ${userEmail}</p>` : ''}
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <span class="stat-number">${userPosts.length}</span>
                        <span class="stat-label">Posts</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">0</span>
                        <span class="stat-label">Views</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${userPosts.reduce((sum, post) => sum + (post.ratings?.length || 0), 0)}</span>
                        <span class="stat-label">Ratings</span>
                    </div>
                </div>
                
                <div class="user-recent-posts">
                    <h3>Recent Posts</h3>
                    ${userPosts.slice(0, 3).map(post => `
                        <div class="mini-post" onclick="vnHub.openPost(${post.id}); document.getElementById('userProfileModal').style.display = 'none';">
                            <h4>${post.title}</h4>
                            <p>${post.description.substring(0, 100)}...</p>
                            <span class="mini-post-time">${this.formatTime(post.created_at)}</span>
                        </div>
                    `).join('') || '<p class="no-posts">No posts yet</p>'}
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    highlightStars(rating) {
        const starBtns = document.querySelectorAll('.star-btn');
        starBtns.forEach((btn, index) => {
            const star = btn.querySelector('i');
            if (index < rating) {
                star.className = 'fas fa-star';
                btn.classList.add('active');
            } else {
                star.className = 'far fa-star';
                btn.classList.remove('active');
            }
        });
    }

    resetStars() {
        const starBtns = document.querySelectorAll('.star-btn');
        starBtns.forEach(btn => {
            const star = btn.querySelector('i');
            star.className = 'far fa-star';
            btn.classList.remove('active');
        });
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return time.toLocaleDateString();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async processFile(file) {
        const maxSizes = {
            image: 10 * 1024 * 1024,
            video: 15 * 1024 * 1024,
            gif: 15 * 1024 * 1024,
            default: 10 * 1024 * 1024
        };

        let maxSize = maxSizes.default;
        if (file.type.startsWith('image/')) {
            maxSize = file.type === 'image/gif' ? maxSizes.gif : maxSizes.image;
        } else if (file.type.startsWith('video/')) {
            maxSize = maxSizes.video;
        }

        if (file.size > maxSize) {
            this.showAlert(`File too large! Max size: ${this.formatFileSize(maxSize)}. Use cloud storage links instead.`, 'error');
            return null;
        }

        if (file.type.startsWith('image/') && file.type !== 'image/gif') {
            return await this.convertToWebP(file);
        }

        return file;
    }

    async convertToWebP(file) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                        type: 'image/webp'
                    });
                    resolve(webpFile);
                }, 'image/webp', 0.8);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    renderFilePreview(file, isModal = false) {
        if (!file || !file.data) {
            return `
                <div class="file-preview">
                    <i class="fas fa-file file-icon"></i>
                    <div class="file-info">
                        <div class="file-name">${file?.name || 'Unknown file'}</div>
                        <div class="file-size">${file?.size || '0 Bytes'}</div>
                    </div>
                </div>
            `;
        }
        
        const type = file.type;
        
        if (type.startsWith('image/')) {
            return `
                <div class="file-preview image-preview">
                    <img src="${file.data}" alt="${file.name}">
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${file.size}</div>
                    </div>
                </div>
            `;
        }
        
        if (type.startsWith('video/')) {
            return `
                <div class="file-preview video-preview">
                    <video controls preload="none">
                        <source src="${file.data}" type="${type}">
                    </video>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${file.size}</div>
                    </div>
                </div>
            `;
        }
        
        if (type.startsWith('audio/')) {
            return `
                <div class="file-preview audio-preview">
                    <audio controls preload="none" style="width: 100%;">
                        <source src="${file.data}" type="${type}">
                    </audio>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${file.size}</div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="file-preview document-preview">
                <div class="file-download" onclick="window.open('${file.data}', '_blank')" style="cursor: pointer; padding: 10px; border: 1px solid #30363d; border-radius: 8px;">
                    <i class="fas fa-file file-icon"></i>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${file.size}</div>
                        <div class="download-hint" style="color: #00d4ff; font-size: 12px;">Click to download</div>
                    </div>
                </div>
            </div>
        `;
    }

    updateUploadArea(file) {
        const uploadArea = document.getElementById('fileUploadArea');
        uploadArea.innerHTML = `
            <div class="upload-placeholder">
                <i class="fas fa-file" style="color: #00d4ff;"></i>
                <p>${file.name}</p>
                <small>${this.formatFileSize(file.size)}</small>
            </div>
        `;
    }

    resetCreateForm() {
        document.getElementById('createForm').reset();
        this.selectedFile = null;
        document.getElementById('fileUploadArea').innerHTML = `
            <div class="upload-placeholder">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Drag & drop files here or click to browse</p>
                <small>Optional: Add files to your post</small>
            </div>
        `;
    }

    updateStats() {
        const totalComments = this.posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
        const totalRatings = this.posts.reduce((sum, post) => sum + (post.ratings?.length || 0), 0);
        
        document.getElementById('totalPosts').textContent = this.posts.length;
        document.getElementById('totalComments').textContent = totalComments;
        document.getElementById('totalRatings').textContent = totalRatings;
        
        this.updateTopContributors();
    }

    updateTopContributors() {
        // Count posts per user
        const userStats = {};
        this.posts.forEach(post => {
            const username = post.profiles?.username;
            const displayName = post.profiles?.display_name;
            const profilePic = post.profiles?.profile_picture_url;
            
            if (username) {
                if (!userStats[username]) {
                    userStats[username] = {
                        username,
                        displayName: displayName || 'Anonymous',
                        profilePic,
                        postCount: 0
                    };
                }
                userStats[username].postCount++;
            }
        });
        
        // Sort by post count and get top 3
        const topUsers = Object.values(userStats)
            .sort((a, b) => b.postCount - a.postCount)
            .slice(0, 3);
        
        const contributorsContainer = document.querySelector('.contributors');
        if (topUsers.length > 0) {
            contributorsContainer.innerHTML = topUsers.map(user => `
                <div class="contributor" onclick="vnHub.openUserProfile('${user.username}')" style="cursor: pointer;">
                    ${user.profilePic ? 
                        `<img src="${user.profilePic}" alt="Profile" style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover;">` : 
                        '<i class="fas fa-user-circle"></i>'
                    }
                    <span>${user.displayName}</span>
                    <span class="contribution">${user.postCount} posts</span>
                </div>
            `).join('');
        } else {
            contributorsContainer.innerHTML = `
                <div class="contributor">
                    <i class="fas fa-user-circle"></i>
                    <span>No contributors yet</span>
                    <span class="contribution">0 posts</span>
                </div>
            `;
        }
    }

    parseMentions(text) {
        // Parse URLs first
        text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #00d4ff; text-decoration: underline;" onclick="event.stopPropagation();">$1</a>');
        // Then parse mentions
        return text.replace(/@([a-zA-Z0-9_]+)/g, '<span class="mention" data-username="$1" style="color: #00d4ff; cursor: pointer;">@$1</span>');
    }

    checkForPostId() {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('postId');
        if (postId) {
            setTimeout(() => this.openPost(parseInt(postId)), 500);
        }
    }
}

const vnHub = new VNHub();