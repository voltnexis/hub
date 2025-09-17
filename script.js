class VNHub {
    constructor() {
        this.posts = JSON.parse(localStorage.getItem('vnhub_posts')) || [];
        this.currentPostId = null;
        this.currentSort = 'recent';
        this.currentCategory = 'all';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderPosts();
        this.updateStats();
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

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#30363d';
            uploadArea.style.background = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                this.updateUploadArea(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.updateUploadArea(e.target.files[0]);
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
    }

    updateUploadArea(file) {
        const uploadArea = document.getElementById('fileUploadArea');
        const icon = this.getFileIcon(file.type);
        uploadArea.innerHTML = `
            <div class="upload-placeholder">
                <i class="${icon}" style="color: #00d4ff;"></i>
                <p>${file.name}</p>
                <small>${this.formatFileSize(file.size)}</small>
            </div>
        `;
    }

    createPost() {
        const title = document.getElementById('postTitle').value;
        const description = document.getElementById('postDescription').value;
        const tags = document.getElementById('postTags').value;
        const fileInput = document.getElementById('fileInput');

        const post = {
            id: Date.now(),
            title,
            description,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            author: 'Anonymous User',
            timestamp: new Date().toISOString(),
            ratings: [],
            comments: [],
            averageRating: 0,
            file: null
        };

        if (fileInput.files[0]) {
            const file = fileInput.files[0];
            post.file = {
                name: file.name,
                size: this.formatFileSize(file.size),
                type: file.type || 'application/octet-stream'
            };
        }

        this.posts.unshift(post);
        this.savePosts();
        this.renderPosts();
        this.updateStats();
        this.resetCreateForm();
        document.getElementById('createModal').style.display = 'none';
    }

    resetCreateForm() {
        document.getElementById('createForm').reset();
        document.getElementById('fileUploadArea').innerHTML = `
            <div class="upload-placeholder">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Drag & drop files here or click to browse</p>
                <small>Optional: Add files to your post</small>
            </div>
        `;
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
                    <div class="post-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="post-meta">
                        <div class="post-author">${post.author}</div>
                        <div class="post-time">${this.formatTime(post.timestamp)}</div>
                    </div>
                </div>
                
                <div class="post-title">${post.title}</div>
                <div class="post-description">${post.description}</div>
                
                ${post.file ? `
                    <div class="post-file">
                        <i class="${this.getFileIcon(post.file.type)} file-icon"></i>
                        <div class="file-info">
                            <div class="file-name">${post.file.name}</div>
                            <div class="file-size">${post.file.size}</div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="post-actions">
                    <button class="action-btn">
                        <i class="fas fa-star"></i>
                        ${post.averageRating.toFixed(1)} (${post.ratings.length})
                    </button>
                    <button class="action-btn">
                        <i class="fas fa-comment"></i>
                        ${post.comments.length}
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
                if (!post.file) return this.currentCategory === 'other';
                const type = post.file.type;
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
                filtered.sort((a, b) => b.averageRating - a.averageRating);
                break;
            case 'trending':
                filtered.sort((a, b) => (b.ratings.length + b.comments.length) - (a.ratings.length + a.comments.length));
                break;
            default:
                filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        return filtered;
    }

    searchPosts(query) {
        if (!query.trim()) {
            this.renderPosts();
            return;
        }

        const container = document.getElementById('postsContainer');
        const filtered = this.posts.filter(post => 
            post.title.toLowerCase().includes(query.toLowerCase()) ||
            post.description.toLowerCase().includes(query.toLowerCase()) ||
            post.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No results found</h3>
                    <p>Try different keywords or browse categories</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(post => `
            <div class="post-card" onclick="vnHub.openPost(${post.id})">
                <div class="post-header">
                    <div class="post-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="post-meta">
                        <div class="post-author">${post.author}</div>
                        <div class="post-time">${this.formatTime(post.timestamp)}</div>
                    </div>
                </div>
                
                <div class="post-title">${post.title}</div>
                <div class="post-description">${post.description}</div>
                
                ${post.file ? `
                    <div class="post-file">
                        <i class="${this.getFileIcon(post.file.type)} file-icon"></i>
                        <div class="file-info">
                            <div class="file-name">${post.file.name}</div>
                            <div class="file-size">${post.file.size}</div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="post-actions">
                    <button class="action-btn">
                        <i class="fas fa-star"></i>
                        ${post.averageRating.toFixed(1)} (${post.ratings.length})
                    </button>
                    <button class="action-btn">
                        <i class="fas fa-comment"></i>
                        ${post.comments.length}
                    </button>
                    <button class="action-btn">
                        <i class="fas fa-share"></i>
                        Share
                    </button>
                </div>
            </div>
        `).join('');
    }

    openPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        this.currentPostId = postId;
        const modal = document.getElementById('postModal');
        const content = document.getElementById('postModalContent');

        content.innerHTML = `
            <div class="post-detail">
                <div class="post-detail-header">
                    <div class="post-detail-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <div class="post-author">${post.author}</div>
                        <div class="post-time">${this.formatTime(post.timestamp)}</div>
                    </div>
                </div>
                
                <h1 class="post-detail-title">${post.title}</h1>
                <p class="post-detail-description">${post.description}</p>
                
                ${post.file ? `
                    <div class="file-attached">
                        <i class="${this.getFileIcon(post.file.type)} file-icon"></i>
                        <div class="file-info">
                            <div class="file-name">${post.file.name}</div>
                            <div class="file-size">${post.file.size}</div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="rating-section">
                    <h3>Rate this post</h3>
                    <div class="rating-input" id="ratingInput">
                        ${[1,2,3,4,5].map(i => `<button class="star-btn" data-rating="${i}"><i class="far fa-star"></i></button>`).join('')}
                    </div>
                    <div class="rating-display">
                        <span class="rating-stars">${this.renderStars(post.averageRating)}</span>
                        <span>${post.averageRating.toFixed(1)} (${post.ratings.length} ratings)</span>
                    </div>
                </div>
                
                <div class="comments-section">
                    <h3>Comments (${post.comments.length})</h3>
                    <div class="comment-form">
                        <input type="text" class="comment-input" placeholder="Add a comment..." id="commentInput">
                        <button class="btn-primary" onclick="vnHub.addComment()">Post</button>
                    </div>
                    <div class="comments-list">
                        ${post.comments.map(comment => `
                            <div class="comment">
                                <div class="comment-author">Anonymous User</div>
                                <div class="comment-text">${comment.text}</div>
                                <div class="comment-time">${this.formatTime(comment.timestamp)}</div>
                            </div>
                        `).join('')}
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

    addRating(rating) {
        const post = this.posts.find(p => p.id === this.currentPostId);
        if (!post) return;

        post.ratings.push(rating);
        post.averageRating = post.ratings.reduce((a, b) => a + b, 0) / post.ratings.length;
        
        this.savePosts();
        this.renderPosts();
        this.updateStats();
        this.openPost(this.currentPostId);
    }

    addComment() {
        const commentInput = document.getElementById('commentInput');
        const text = commentInput.value.trim();
        
        if (!text) return;

        const post = this.posts.find(p => p.id === this.currentPostId);
        if (!post) return;

        post.comments.unshift({
            text: text,
            timestamp: new Date().toISOString()
        });

        this.savePosts();
        this.updateStats();
        commentInput.value = '';
        this.openPost(this.currentPostId);
    }

    updateStats() {
        const totalComments = this.posts.reduce((sum, post) => sum + post.comments.length, 0);
        const totalRatings = this.posts.reduce((sum, post) => sum + post.ratings.length, 0);
        
        document.getElementById('totalPosts').textContent = this.posts.length;
        document.getElementById('totalComments').textContent = totalComments;
        document.getElementById('totalRatings').textContent = totalRatings;
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

    getFileIcon(type) {
        if (type.startsWith('image/')) return 'fas fa-image';
        if (type.startsWith('video/')) return 'fas fa-video';
        if (type.startsWith('audio/')) return 'fas fa-music';
        if (type.includes('pdf')) return 'fas fa-file-pdf';
        if (type.includes('word')) return 'fas fa-file-word';
        if (type.includes('excel') || type.includes('spreadsheet')) return 'fas fa-file-excel';
        if (type.includes('zip') || type.includes('rar')) return 'fas fa-file-archive';
        if (type.includes('javascript') || type.includes('python')) return 'fas fa-code';
        return 'fas fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    savePosts() {
        localStorage.setItem('vnhub_posts', JSON.stringify(this.posts));
    }
}

const vnHub = new VNHub();