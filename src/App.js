import React, { useState, useEffect, useCallback, useRef } from 'react';
import Modal from 'react-modal';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import WebSocketService from './webSocketService';
import GeneratorControlPanel from './components/GeneratorControlPanel';

function App() {
  useEffect(() => {
    Modal.setAppElement('#root');
  }, []);

  const SERVER_URL = 'http://192.168.0.109:5003';

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

  // Add these new state variables
  const [wsConnected, setWsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStats, setGenerationStats] = useState({ link: 0, photo: 0, video: 0 });
  const wsService = useRef(null);

  // Initialize WebSocket service
  useEffect(() => {
    // Create WebSocket service
    const serverUrl = SERVER_URL || 'http://localhost:5003';
    wsService.current = new WebSocketService(serverUrl);
    
    // Setup event listeners
    const connectionListener = (connected) => {
      setWsConnected(connected);
    };
    
    const newPostListener = (post) => {
      // Add new post to the list
      setPosts(prevPosts => {
        // Check if post already exists
        if (prevPosts.some(p => p.id === post.id)) {
          return prevPosts;
        }
        return [post, ...prevPosts];
      });
    };
    
    const generatorStatusListener = (isActive) => {
      setIsGenerating(isActive);
    };
    
    const statsListener = (stats) => {
      setGenerationStats(stats);
    };
    
    // Add event listeners
    wsService.current.addEventListener('connectionChange', connectionListener);
    wsService.current.addEventListener('newPost', newPostListener);
    wsService.current.addEventListener('generatorStatus', generatorStatusListener);
    wsService.current.addEventListener('generationStats', statsListener);
    
    // Connect to the WebSocket server
    wsService.current.connect();
    
    // Cleanup function
    return () => {
      wsService.current.removeEventListener('connectionChange', connectionListener);
      wsService.current.removeEventListener('newPost', newPostListener);
      wsService.current.removeEventListener('generatorStatus', generatorStatusListener);
      wsService.current.removeEventListener('generationStats', statsListener);
      wsService.current.disconnect();
    };
  }, []);

  // Handler functions for generator control
  const handleStartGenerator = () => {
    if (wsService.current) {
      wsService.current.startGenerator();
    }
  };
  
  const handleStopGenerator = () => {
    if (wsService.current) {
      wsService.current.stopGenerator();
    }
  };

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
      
      xhr.open('POST', `${SERVER_URL}/upload`, true);
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

  const syncLocalStorageToServer = async () => {
    try {
      // Only proceed if we have data in localStorage and the server is back online
      if (isNetworkDown || isServerDown) return;
      
      const savedPosts = localStorage.getItem('posts');
      if (!savedPosts) return;
      
      const parsedPosts = JSON.parse(savedPosts);
      console.log(`Syncing ${parsedPosts.length} posts from localStorage to server...`);
      
      // Track successes and failures
      let successCount = 0;
      let failureCount = 0;
      
      // Process each post from localStorage
      for (const post of parsedPosts) {
        try {
          // Check if post already exists on server
          const checkResponse = await fetch(`${SERVER_URL}/posts/${post.id}`);
          
          if (checkResponse.status === 404) {
            // Post doesn't exist on server, so create it
            const createResponse = await fetch(`${SERVER_URL}/posts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(post)
            });
            
            if (createResponse.ok) {
              successCount++;
            } else {
              failureCount++;
            }
          } else if (checkResponse.ok) {
            // Post exists, check if we need to update it
            const serverPost = await checkResponse.json();
            
            // Compare local and server posts - if different, update server
            if (post.text !== serverPost.text || post.img !== serverPost.img) {
              const updateResponse = await fetch(`${SERVER_URL}/posts/${post.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: post.text,
                  img: post.img,
                  isVideo: post.isVideo
                })
              });
              
              if (updateResponse.ok) {
                successCount++;
              } else {
                failureCount++;
              }
            }
          }
        } catch (error) {
          console.error(`Error processing post ${post.id}:`, error);
          failureCount++;
        }
      }
      
      console.log(`Sync complete: ${successCount} successful, ${failureCount} failed`);
      
      // If any changes were made, refresh posts from the server
      if (successCount > 0) {
        await fetchPosts();
      }
    } catch (error) {
      console.error("Error syncing from localStorage to server:", error);
    }
  };

  // Save posts to local storage with optimization
  const savePostsToLocalStorage = (updatedPosts) => {
    try {
      localStorage.setItem('posts', JSON.stringify(updatedPosts));
      console.log('Saved', updatedPosts.length, 'posts to local storage');
    } catch (error) {
      // Handle localStorage quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('Local storage quota exceeded. Trying to save essential data only.');
        // Try to save just the text and IDs as a fallback
        const essentialData = updatedPosts.map(post => ({
          id: post.id,
          text: post.text,
          date: post.date
        }));
        localStorage.setItem('posts-essential', JSON.stringify(essentialData));
      } else {
        console.error('Error saving posts to localStorage:', error);
      }
    }
  };

  // Fetch posts from the backend
  const fetchPosts = async () => {
    try {
      if (!navigator.onLine) {
        setIsNetworkDown(true);
        loadPostsFromLocalStorage();
        return;
      }

      const response = await fetch(`${SERVER_URL}/posts`);
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

  // Improved sync offline queue function
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
            console.log("DELETE operation successful for ID:", operation.id || "unknown");
            operationsToRemove.push(i);
            syncedData = true;
          } else {
            console.log(`DELETE operation failed with status: ${response.status}`);
          }
        }
      } catch (error) {
        console.error("Failed to sync operation:", error);
        // Don't remove failed operations, we'll retry them later
      }
    }
    
    // Remove processed operations from the queue
    if (operationsToRemove.length > 0) {
      // Create a new queue excluding the processed operations
      const newQueue = offlineQueue.filter((_, index) => !operationsToRemove.includes(index));
      setOfflineQueue(newQueue);
      // LocalStorage update happens via useEffect
      
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
      url: `${SERVER_URL}/posts`,
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
      url: `${SERVER_URL}/posts/${id}`,
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
      url: `${SERVER_URL}/posts/${id}`,
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

  // Check server status periodically with improved error handling
  useEffect(() => {
    if (isNetworkDown) return;
    
    // Add a flag to prevent multiple sync attempts
    let isSyncing = false;
    
    const checkServerStatus = async () => {
      try {
        console.log("Checking server status...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${SERVER_URL}/`, { 
          signal: controller.signal,
          cache: 'no-store' // Prevent caching
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          if (isServerDown) {
            console.log("Server was down, now it's up");
            setIsServerDown(false);
            
            // Only sync if not already syncing
            if (!isSyncing) {
              console.log("Starting sync process...");
              isSyncing = true;
              
              // Add a delay to ensure state is updated
              setTimeout(() => {
                // First sync localStorage data to server
                syncLocalStorageToServer().then(() => {
                  // Then sync offline queue operations
                  if (offlineQueue.length > 0) {
                    return syncOfflineQueue();
                  }
                }).finally(() => {
                  isSyncing = false;
                });
              }, 1000);
            }
          }
        } else {
          setIsServerDown(true);
        }
      } catch (error) {
        console.log("Server is down:", error.message);
        setIsServerDown(true);
      }
    };
    
    const interval = setInterval(checkServerStatus, 15000); // Check every 15 seconds
    
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

  // Add these to your useEffect hooks
  // Load offline queue from localStorage when the component mounts
  useEffect(() => {
    const savedQueue = localStorage.getItem('offlineQueue');
    if (savedQueue) {
      try {
        setOfflineQueue(JSON.parse(savedQueue));
      } catch (error) {
        console.error('Error parsing offline queue from localStorage', error);
      }
    }
  }, []);

  // Save offline queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

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
        {/* Add Generator Control Panel at the top of the right sidebar */}
        <div className="sidebar-item generator-container">
          <GeneratorControlPanel 
            isGenerating={isGenerating}
            stats={generationStats}
            onStartGenerator={handleStartGenerator}
            onStopGenerator={handleStopGenerator}
            isConnected={wsConnected}
          />
        </div>
        
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

// Improved utility function to check if a file is a video
const isVideoFile = (filePath) => {
  if (!filePath) return false;
  
  // Check by file extension
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
  const hasVideoExtension = videoExtensions.some(ext => 
    filePath.toLowerCase().endsWith(ext)
  );
  
  // Also check by URL parameter or MIME type indicators
  const hasVideoParam = filePath.includes('video') || 
                        filePath.includes('mp4') || 
                        filePath.includes('webm');
                         
  return hasVideoExtension || hasVideoParam;
};

// Add this function to synchronize localStorage data with the server


export default App;