// Supabase CDN configuration - No npm required
const SUPABASE_URL = 'https://impvduovhttyfgxqpitj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltcHZkdW92aHR0eWZneHFwaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzAwNDksImV4cCI6MjA3NTMwNjA0OX0.mqH4x6emqmtAxpL-XldFtlnDo7djS7O-tOSMAGg-e4E'

// Initialize Supabase client using CDN
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Database helper functions
const db = {
  // Auth functions
  async signUp(email, password, username, displayName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName }
      }
    })
    return { data, error }
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Profile functions
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  // Posts functions
  async getPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:author_id (id, username, display_name, profile_picture_url),
        ratings (rating),
        comments (id)
      `)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async createPost(post, file = null) {
    if (file) {
      console.log('Uploading file:', file.name, file.size, file.type)
      
      // Upload file first
      const fileResult = await this.uploadFile(file, post.author_id)
      if (fileResult.error) {
        console.error('File upload error:', fileResult.error)
        return { data: null, error: fileResult.error }
      }
      
      console.log('File uploaded successfully:', fileResult.data)
      
      // Add file info to post
      post.file_name = file.name
      post.file_size = file.size.toString()
      post.file_type = file.type
      post.file_url = fileResult.data.url
    }
    
    console.log('Creating post with data:', post)
    
    const { data, error } = await supabase
      .from('posts')
      .insert(post)
      .select()
      .single()
    
    if (error) console.error('Post creation error:', error)
    else console.log('Post created successfully:', data)
    
    return { data, error }
  },

  async deletePost(postId) {
    // Get post data to check for file
    const { data: post } = await supabase
      .from('posts')
      .select('file_url')
      .eq('id', postId)
      .single()
    
    // Delete file from storage if exists
    if (post?.file_url) {
      const fileName = post.file_url.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('files')
          .remove([fileName])
      }
    }
    
    // Delete post
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
    return { error }
  },

  // Comments functions
  async getComments(postId) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (username, display_name)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async createComment(comment) {
    const { data, error } = await supabase
      .from('comments')
      .insert(comment)
      .select()
      .single()
    return { data, error }
  },

  // Ratings functions
  async createRating(rating) {
    const { data, error } = await supabase
      .from('ratings')
      .upsert(rating)
      .select()
      .single()
    return { data, error }
  },

  // Saved posts functions
  async getSavedPosts(userId) {
    const { data, error } = await supabase
      .from('saved_posts')
      .select(`
        post_id,
        posts (*)
      `)
      .eq('user_id', userId)
    return { data, error }
  },

  async savePost(userId, postId) {
    const { data, error } = await supabase
      .from('saved_posts')
      .insert({ user_id: userId, post_id: postId })
      .select()
      .single()
    return { data, error }
  },

  async unsavePost(userId, postId) {
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)
    return { error }
  },

  // File upload functions
  async uploadFile(file, userId, postId = null) {
    const fileExt = file.name.split('.').pop()
    const fileName = postId 
      ? `${userId}/${postId}_${Date.now()}.${fileExt}`
      : `${userId}/${Date.now()}.${fileExt}`
    
    console.log('Uploading to storage:', fileName)
    
    const { data, error } = await supabase.storage
      .from('files')
      .upload(fileName, file)
    
    if (error) {
      console.error('Storage upload error:', error)
      return { data: null, error }
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(fileName)
    
    console.log('File uploaded, public URL:', publicUrl)
    
    return { data: { path: fileName, url: publicUrl }, error: null }
  },

  // Profile picture upload
  async uploadAvatar(file, userId) {
    // Get current profile to check for existing avatar
    const { data: profile } = await this.getProfile(userId)
    
    // Delete existing avatar if it exists
    if (profile?.profile_picture_url) {
      const oldPath = profile.profile_picture_url.split('/').pop()
      if (oldPath && oldPath.includes('avatar')) {
        await supabase.storage
          .from('avatars')
          .remove([`${userId}/${oldPath}`])
      }
    }
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file)
    
    if (error) return { data: null, error }
    
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
    
    return { data: { path: fileName, url: publicUrl }, error: null }
  },

  // Remove profile picture
  async removeAvatar(userId) {
    // Get current profile to find the exact file to delete
    const { data: profile } = await this.getProfile(userId)
    
    if (profile?.profile_picture_url) {
      const fileName = profile.profile_picture_url.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('avatars')
          .remove([`${userId}/${fileName}`])
      }
    }
    
    // Update profile to remove picture URL
    const { error } = await this.updateProfile(userId, { profile_picture_url: null })
    
    return { error }
  },

  // Account management functions
  async changeUsername(newUsername) {
    const { data, error } = await supabase.rpc('change_username', {
      new_username: newUsername
    })
    return { data, error }
  },

  async deactivateAccount() {
    const { data, error } = await supabase.rpc('deactivate_account')
    return { data, error }
  },

  async reactivateAccount() {
    const { data, error } = await supabase.rpc('reactivate_account')
    return { data, error }
  },

  async deleteAccount() {
    const { data, error } = await supabase.rpc('delete_account')
    return { data, error }
  },

  // Get user email if visibility is enabled
  async getUserEmail(userId) {
    const { data, error } = await supabase.rpc('get_user_email', { user_id: userId })
    return { data, error }
  }
}