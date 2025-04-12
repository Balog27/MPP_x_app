import React, { useState, useEffect, useCallback } from 'react';
import Modal from 'react-modal';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  useEffect(() => {
    Modal.setAppElement('#root');
  }, []);

  const [posts, setPosts] = useState([]); // Stores posts
  const [modalIsOpen, setModalIsOpen] = useState(false); // Modal state
  const [newPostText, setNewPostText] = useState(''); // New post text
  const [newPostImg, setNewPostImg] = useState(''); // New post image
  const [menuOpen, setMenuOpen] = useState(null); // Menu state
  const [searchTerm, setSearchTerm] = useState(''); // Search term
  const [sortOrder, setSortOrder] = useState(''); // Sort order
  const [isNetworkDown, setIsNetworkDown] = useState(false); // Tracks network status
  const [isServerDown, setIsServerDown] = useState(false); // Tracks server status
  const [offlineQueue, setOfflineQueue] = useState([]); // Stores offline operations
  const [editingPost, setEditingPost] = useState(null); // Track which post is being edited
  const [serverRestartDetected, setServerRestartDetected] = useState(false);
  const [uploadType, setUploadType] = useState('url'); // 'url' or 'file'
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Add this function to your App component
  const uploadFile = async (file) => {
    if (!file) return null;
    
    setIsUploading(true);
    setFileUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          setFileUploadProgress(progress);
        }
      });
      
      // Promise to handle XHR completion
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
      });
      
      xhr.open('POST', 'http://localhost:5003/upload', true);
      xhr.send(formData);
      
      const response = await uploadPromise;
      setIsUploading(false);
      
      // Return the URL to the uploaded file
      return response.url;
    } catch (error) {
      console.error('Error uploading file:', error);
      setIsUploading(false);
      return null;
    }
  };

  // Load posts from local storage when offline - FIXED
  const loadPostsFromLocalStorage = () => {
    const savedPosts = localStorage.getItem('posts');
    if (savedPosts) {
      // Check if posts are already loaded
      const parsedPosts = JSON.parse(savedPosts);
      
      // If posts are empty, load from localStorage
      if (posts.length === 0) {
        setPosts(parsedPosts);
      }
      // If there are already posts, check for duplicates
      else {
        // Create a map of existing post IDs for quick lookup
        const existingPostIds = new Set(posts.map(post => post.id));
        
        // Only add posts that don't already exist
        const newPosts = parsedPosts.filter(post => !existingPostIds.has(post.id));
        
        if (newPosts.length > 0) {
          setPosts(prev => [...prev, ...newPosts]);
        }
      }
    }
  };

  // Save posts to local storage
  const savePostsToLocalStorage = (updatedPosts) => {
    localStorage.setItem('posts', JSON.stringify(updatedPosts));
  };

  // Fetch posts from the backend
  const fetchPosts = async () => {
    try {
      if (!navigator.onLine) {
        setIsNetworkDown(true);
        loadPostsFromLocalStorage();
        return;
      }

      const response = await fetch('http://localhost:5003/posts');
      if (!response.ok) throw new Error('Server is down');
      const data = await response.json();
      setPosts(data);
      setIsServerDown(false);
      
      // Save posts to local storage for offline use
      savePostsToLocalStorage(data);
    } catch (error) {
      setIsServerDown(true);
      console.error('Error fetching posts:', error);
      loadPostsFromLocalStorage();
    }
  };

  // Sync offline operations - FIXED to handle new posts correctly
  const syncOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return;
    
    console.log("Syncing offline queue:", offlineQueue.length, "operations");
    
    // Track which operations have been processed
    const processedOperations = new Set();
    // Keep track of operations to remove
    const operationsToRemove = [];
    // Keep track of synced posts
    let syncedData = false;
    
    // Process each operation in the queue
    for (let i = 0; i < offlineQueue.length; i++) {
      const operation = offlineQueue[i];
      
      // Create a unique key for this operation
      const operationKey = `${operation.url}-${operation.options.method}-${
        operation.id || ''
      }`;
      
      // Skip if we've already processed this operation
      if (processedOperations.has(operationKey)) {
        operationsToRemove.push(i);
        continue;
      }
      
      processedOperations.add(operationKey);
      
      try {
        console.log(`Processing ${operation.options.method} operation for ID: ${operation.id || 'new'}`);
        
        // For POST operations, we need to preserve the local post data
        if (operation.options.method === 'POST' && operation.localPost) {
          // Make sure we're sending the complete local post data
          operation.options.body = JSON.stringify(operation.localPost);
          
          const response = await fetch(operation.url, operation.options);
          
          if (response.ok) {
            console.log("POST operation successful");
            operationsToRemove.push(i);
            syncedData = true;
          } else {
            console.log(`POST operation failed with status: ${response.status}`);
          }
        } 
        // For PUT operations, we need to ensure we update the correct post
        else if (operation.options.method === 'PUT' && operation.id) {
          // Make sure we're sending the complete local post data if available
          if (operation.localPost) {
            operation.options.body = JSON.stringify(operation.localPost);
          }
          
          const response = await fetch(operation.url, operation.options);
          
          if (response.ok) {
            console.log("PUT operation successful for ID:", operation.id);
            operationsToRemove.push(i);
            syncedData = true;
          } else {
            console.log(`PUT operation failed with status: ${response.status}`);
          }
        }
        // For DELETE operations
        else {
          const response = await fetch(operation.url, operation.options);
          
          if (response.ok) {
            console.log("Operation successful for ID:", operation.id || "unknown");
            operationsToRemove.push(i);
            syncedData = true;
          } else {
            console.log(`Operation failed with status: ${response.status}`);
          }
        }
      } catch (error) {
        console.error("Failed to sync operation:", error);
      }
    }
    
    // Remove processed operations from the queue
    if (operationsToRemove.length > 0) {
      // Create a new queue excluding the processed operations
      const newQueue = offlineQueue.filter((_, index) => !operationsToRemove.includes(index));
      setOfflineQueue(newQueue);
      
      // Only fetch fresh data if we've synced any operations successfully
      if (syncedData) {
        // It's better to fetch fresh data after all operations are processed
        // to avoid intermediate states
        await fetchPosts();
      }
    }
  }, [offlineQueue]);

  // Update the addPost function
  const addPost = async () => {
    // If we're uploading a file, process that first
    let imageUrl = newPostImg;
    
    if (uploadType === 'file' && selectedFile) {
      const uploadedFileUrl = await uploadFile(selectedFile);
      if (!uploadedFileUrl) {
        alert('File upload failed. Please try again.');
        return;
      }
      imageUrl = uploadedFileUrl;
    }
    
    const newId = Date.now().toString();
    const newPost = { 
      id: newId,
      text: newPostText, 
      img: imageUrl, 
      date: new Date().toLocaleString(),
      isVideo: selectedFile ? selectedFile.type.startsWith('video/') : isVideoFile(imageUrl)
    };
    
    const operation = {
      url: 'http://localhost:5003/posts',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      },
      localPost: newPost, // Store the local post data with the operation
      id: newId // Add consistent id for tracking
    };

    if (isNetworkDown || isServerDown) {
      // First add to queue
      setOfflineQueue((prev) => [...prev, operation]);
      
      // Then update the UI and localStorage
      const updatedPosts = [...posts, newPost];
      setPosts(updatedPosts);
      savePostsToLocalStorage(updatedPosts);
    } else {
      try {
        const response = await fetch(operation.url, operation.options);
        if (response.ok) {
          const savedPost = await response.json();
          const updatedPosts = [...posts, savedPost];
          setPosts(updatedPosts);
          savePostsToLocalStorage(updatedPosts);
        } else {
          throw new Error('Failed to add post');
        }
      } catch (error) {
        setOfflineQueue((prev) => [...prev, operation]);
        const updatedPosts = [...posts, newPost];
        setPosts(updatedPosts);
        savePostsToLocalStorage(updatedPosts);
      }
    }

    setModalIsOpen(false);
    setNewPostText('');
    setNewPostImg('');
  };

  // Delete a post
  const deletePost = (id) => {
    const operation = {
      url: `http://localhost:5003/posts/${id}`,
      options: { method: 'DELETE' },
      id: id // Add id to identify which post to delete when syncing
    };
  
    if (isNetworkDown || isServerDown) {
      setOfflineQueue((prev) => [...prev, operation]);
      const updatedPosts = posts.filter((post) => post.id !== id);
      setPosts(updatedPosts);
      savePostsToLocalStorage(updatedPosts);
    } else {
      fetch(operation.url, operation.options)
        .then((response) => {
          if (response.ok) {
            const updatedPosts = posts.filter((post) => post.id !== id);
            setPosts(updatedPosts);
            savePostsToLocalStorage(updatedPosts);
          } else {
            throw new Error('Failed to delete post');
          }
        })
        .catch(() => {
          setOfflineQueue((prev) => [...prev, operation]);
          const updatedPosts = posts.filter((post) => post.id !== id);
          setPosts(updatedPosts);
          savePostsToLocalStorage(updatedPosts);
        });
    }
  };

  // Open edit modal
  const startEditingPost = (id) => {
    const post = posts.find((post) => post.id === id);
    setNewPostText(post.text);
    setNewPostImg(post.img);
    setEditingPost(id);
    setModalIsOpen(true);
  };

  // Similarly update saveEditedPost to handle file uploads
  const saveEditedPost = async () => {
    let imageUrl = newPostImg;
    
    if (uploadType === 'file' && selectedFile) {
      const uploadedFileUrl = await uploadFile(selectedFile);
      if (!uploadedFileUrl) {
        alert('File upload failed. Please try again.');
        return;
      }
      imageUrl = uploadedFileUrl;
    }
    
    const id = editingPost;
    const updatedPost = {
      text: newPostText,
      img: imageUrl
    };

    const operation = {
      url: `http://localhost:5003/posts/${id}`,
      options: {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPost),
      },
      id: id, // Add id to identify which post to update when syncing
      localPost: { ...updatedPost, id } // Store the local updated post data
    };
  
    if (isNetworkDown || isServerDown) {
      setOfflineQueue((prev) => [...prev, operation]);
      const updatedPosts = posts.map((post) => 
        post.id === id ? { ...post, text: newPostText, img: imageUrl } : post
      );
      setPosts(updatedPosts);
      savePostsToLocalStorage(updatedPosts);
    } else {
      try {
        const response = await fetch(operation.url, operation.options);
        if (response.ok) {
          const serverPost = await response.json();
          const updatedPosts = posts.map((post) => 
            post.id === id ? serverPost : post
          );
          setPosts(updatedPosts);
          savePostsToLocalStorage(updatedPosts);
        } else {
          throw new Error('Failed to update post');
        }
      } catch (error) {
        setOfflineQueue((prev) => [...prev, operation]);
        const updatedPosts = posts.map((post) => 
          post.id === id ? { ...post, text: newPostText, img: imageUrl } : post
        );
        setPosts(updatedPosts);
        savePostsToLocalStorage(updatedPosts);
      }
    }

    setModalIsOpen(false);
    setNewPostText('');
    setNewPostImg('');
    setEditingPost(null);
  };

  // Handle form submit based on whether we're adding or editing
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (editingPost) {
      saveEditedPost();
    } else {
      addPost();
    }
  };

  // Detect network status - FIXED VERSION
  useEffect(() => {
    // Add a flag to prevent multiple sync attempts
    let isSyncing = false;

    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      setIsNetworkDown(!isOnline);
      
      // Try to sync when back online
      if (isOnline && !isServerDown && offlineQueue.length > 0 && !isSyncing) {
        console.log("Network is back online, starting sync...");
        isSyncing = true;
        
        setTimeout(() => {
          syncOfflineQueue().finally(() => {
            isSyncing = false;
          });
        }, 1000);
      }
    };
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
    
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, [isServerDown, offlineQueue.length, syncOfflineQueue]);

  // Check server status periodically when online - FIXED VERSION
  useEffect(() => {
    if (isNetworkDown) return;
    
    // Add a flag to prevent multiple sync attempts
    let isSyncing = false;
    
    const checkServerStatus = async () => {
      try {
        console.log("Checking server status...");
        const response = await fetch('http://localhost:5003/');
        
        if (response.ok) {
          if (isServerDown) {
            console.log("Server was down, now it's up");
            setIsServerDown(false);
            
            // Only sync if not already syncing and there are operations
            if (!isSyncing && offlineQueue.length > 0) {
              console.log("Starting sync process...");
              isSyncing = true;
              
              // Add a delay to ensure state is updated
              setTimeout(() => {
                syncOfflineQueue().finally(() => {
                  isSyncing = false;
                });
              }, 1000);
            }
          }
        }
      } catch (error) {
        console.log("Server is down:", error.message);
        setIsServerDown(true);
      }
    };
    
    const interval = setInterval(checkServerStatus, 15000); // Increase to 15 seconds
    
    // Check immediately on mount or when dependencies change
    checkServerStatus();
    
    return () => clearInterval(interval);
  }, [isNetworkDown, isServerDown, offlineQueue.length, syncOfflineQueue]);

  // Initial fetch
  useEffect(() => {
    const initialLoad = async () => {
      await fetchPosts();
      
      // Deduplicate any posts that might have been loaded
      setPosts(posts => deduplicatePosts(posts));
    };
    
    initialLoad();
  }, []);

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle sort
  const handleSort = (order) => {
    const sortedPosts = [...posts].sort((a, b) => {
      if (order === 'asc') return a.text.localeCompare(b.text);
      return b.text.localeCompare(a.text);
    });
    setPosts(sortedPosts);
    setSortOrder(order);
  };

  // Filtered posts
  const filteredPosts = posts.filter((post) =>
    post.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get description class
  const getDescriptionClass = (text) => {
    const length = text.split(' ').length;
    if (length < 5) return 'short-description';
    if (length <= 20) return 'medium-description';
    return 'long-description';
  };

  // Get statistics
  const getStatistics = () => {
    const totalPosts = posts.length;
    const shortDescriptions = posts.filter((post) => post.text.split(' ').length < 5).length;
    const mediumDescriptions = posts.filter(
      (post) => post.text.split(' ').length >= 5 && post.text.split(' ').length <= 20
    ).length;
    const longDescriptions = posts.filter((post) => post.text.split(' ').length > 20).length;
    return { totalPosts, shortDescriptions, mediumDescriptions, longDescriptions };
  };

  const { totalPosts, shortDescriptions, mediumDescriptions, longDescriptions } = getStatistics();

  return (
    <div className="App">
      {isNetworkDown && <div className="alert network-alert">Network is down. Working in offline mode.</div>}
      {isServerDown && !isNetworkDown && <div className="alert server-alert">Server is down. Working in offline mode.</div>}
      
      <aside className="App-sidebar">
        <div className="sidebar-item">Main Screen</div>
        <div className="sidebar-item">
          Explore
          <i className="fas fa-search" onClick={() => setSearchTerm('')}></i>
        </div>
        <div className="sidebar-item">Notifications</div>
        <div className="sidebar-item">Messages</div>
      </aside>
      <main className="App-main">
        <div className="buttons">
          <button onClick={() => { setEditingPost(null); setNewPostText(''); setNewPostImg(''); setModalIsOpen(true); }}>
            Add Post
          </button>
          <div className="sort-options">
            <button onClick={() => handleSort('asc')}>Sort A-Z</button>
            <button onClick={() => handleSort('desc')}>Sort Z-A</button>
          </div>
          <input
            type="text"
            placeholder="Search posts"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div id="posts-container">
          {filteredPosts.map((post) => (
            <div key={post.id} className="post">
              <div className="post-menu">
                <button onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)}>⋮</button>
                {menuOpen === post.id && (
                  <div className="post-menu-options">
                    <button onClick={() => startEditingPost(post.id)}>Edit</button>
                    <button onClick={() => deletePost(post.id)}>Delete</button>
                  </div>
                )}
              </div>
              <p className={getDescriptionClass(post.text)}>{post.text}</p>
              <p className="post-date">{post.date}</p>
              
              {/* Improved video/image rendering */}
              {post.isVideo || isVideoFile(post.img) ? (
                <video 
                  controls
                  className="post-media"
                  src={post.img}
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img 
                  src={post.img} 
                  alt="Post content" 
                  className="post-media" 
                  onError={(e) => {
                    // If image fails to load, try as video
                    if (!post.videoAttempted) {
                      post.videoAttempted = true;
                      console.log("Trying to load as video:", post.img);
                      const video = document.createElement('video');
                      video.src = post.img;
                      video.onloadedmetadata = () => {
                        post.isVideo = true;
                        setPosts([...posts]);
                      };
                    }
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </main>
      <aside className="App-sidebar-right">
        <div className="sidebar-item">
          <h3>Statistics</h3>
          <table className="statistics-table">
            <tbody>
              <tr>
                <td>Total Posts:</td>
                <td>{totalPosts}</td>
              </tr>
              <tr>
                <td>Short Descriptions (0-4 words):</td>
                <td>{shortDescriptions}</td>
              </tr>
              <tr>
                <td>Medium Descriptions (5-20 words):</td>
                <td>{mediumDescriptions}</td>
              </tr>
              <tr>
                <td>Long Descriptions (20+ words):</td>
                <td>{longDescriptions}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {offlineQueue.length > 0 && (
          <div className="sidebar-item">
            <h3>Pending Operations</h3>
            <p>{offlineQueue.length} operations waiting to sync</p>
            <div className="queue-buttons">
              {!isNetworkDown && !isServerDown && (
                <button 
                  onClick={syncOfflineQueue}
                  className="sync-button"
                >
                  Sync Now
                </button>
              )}
              <button 
                onClick={() => {
                  if (window.confirm('Clear all pending operations? This cannot be undone.')) {
                    setOfflineQueue([]);
                  }
                }}
                className="clear-button"
              >
                Clear Queue
              </button>
            </div>
          </div>
        )}
      </aside>
      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)}>
        <h2>{editingPost ? 'Edit post' : 'Add a new post'}</h2>
        <form onSubmit={handleFormSubmit}>
          {/* Enhanced upload type selector UI */}
          <div className="upload-type-selector">
            <div className={`upload-option ${uploadType === 'url' ? 'active' : ''}`}>
              <label>
                <input
                  type="radio"
                  name="uploadType"
                  value="url"
                  checked={uploadType === 'url'}
                  onChange={() => {
                    setUploadType('url');
                    setSelectedFile(null);
                  }}
                />
                <span className="upload-option-text">
                  <i className="fas fa-link"></i> Enter URL
                </span>
              </label>
            </div>
            <div className={`upload-option ${uploadType === 'file' ? 'active' : ''}`}>
              <label>
                <input
                  type="radio"
                  name="uploadType"
                  value="file"
                  checked={uploadType === 'file'}
                  onChange={() => setUploadType('file')}
                />
                <span className="upload-option-text">
                  <i className="fas fa-upload"></i> Upload File
                </span>
              </label>
            </div>
          </div>
          
          {uploadType === 'url' ? (
            <label>
              Image/Video URL:
              <input
                type="text"
                placeholder="Enter image or video URL"
                value={newPostImg}
                onChange={(e) => setNewPostImg(e.target.value)}
                required={uploadType === 'url'}
              />
            </label>
          ) : (
            <div className="file-upload-container">
              <label className="file-upload-label">
                <span>Select File (Image/Video up to 500MB)</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setSelectedFile(file);
                    
                    // Log file info for debugging
                    if (file) {
                      console.log('Selected file:', file.name, file.type, file.size);
                      
                      // Pre-set the isVideo flag based on MIME type
                      if (file.type.startsWith('video/')) {
                        console.log('Video file detected');
                      }
                    }
                  }}
                  required={uploadType === 'file'}
                  className="file-input"
                />
                {selectedFile && (
                  <span className="selected-file-name">
                    {selectedFile.name} ({Math.round(selectedFile.size / 1024 / 1024 * 10) / 10} MB)
                  </span>
                )}
              </label>
              
              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${fileUploadProgress}%` }}
                    ></div>
                  </div>
                  <span>{fileUploadProgress}%</span>
                </div>
              )}
            </div>
          )}
          
          <label>
            Description:
            <input
              type="text"
              placeholder="Enter description"
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              required
            />
          </label>
          
          <button type="submit" disabled={isUploading}>
            {isUploading ? 'Uploading...' : (editingPost ? 'Save Changes' : 'Submit Post')}
          </button>
          <button 
            type="button"
            disabled={isUploading} 
            onClick={() => {
              setModalIsOpen(false);
              setEditingPost(null);
              setNewPostText('');
              setNewPostImg('');
              setSelectedFile(null);
              setUploadType('url');
            }}
          >
            Cancel
          </button>
        </form>
      </Modal>
    </div>
  );
}

// Add this near your other utility functions
const deduplicatePosts = (postArray) => {
  const seen = new Set();
  return postArray.filter(post => {
    if (seen.has(post.id)) {
      return false;
    }
    seen.add(post.id);
    return true;
  });
};

// Add this utility function to check if a file is a video
const isVideoFile = (filePath) => {
  const videoExtensions = ['.mp4', '.webm', '.ogg'];
  return videoExtensions.some((ext) => filePath.endsWith(ext));
};

export default App;