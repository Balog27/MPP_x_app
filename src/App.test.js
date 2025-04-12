import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { faker } from '@faker-js/faker';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import './App.css';

import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  useEffect(() => {
    Modal.setAppElement('#root');
  }, []);

  const generateRandomPosts = (numPosts) => {
    const posts = [];
    for (let i = 0; i < numPosts; i++) {
      posts.push({
        id: faker.datatype.uuid(),
        text: faker.lorem.sentence(),
        img: faker.image.imageUrl(),
        date: faker.date.recent().toLocaleString(),
      });
    }
    console.log(posts); // Check the generated posts
    return posts;
  };
  

  

  const [posts, setPosts] = useState(generateRandomPosts(10));
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImg, setNewPostImg] = useState('');
  const [menuOpen, setMenuOpen] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  const addPost = () => {
    const newPost = { id: Date.now(), text: newPostText, img: newPostImg, date: new Date().toLocaleString() };
    setPosts([...posts, newPost]);
    setModalIsOpen(false);
    setNewPostText('');
    setNewPostImg('');
  };

  const deletePost = (id) => {
    setPosts(posts.filter(post => post.id !== id));
  };

  const editPost = (id) => {
    const post = posts.find(post => post.id === id);
    setNewPostText(post.text);
    setNewPostImg(post.img);
    setModalIsOpen(true);
    deletePost(id);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSort = (order) => {
    const sortedPosts = [...posts].sort((a, b) => {
      if (order === 'asc') {
        return a.text.localeCompare(b.text);
      } else {
        return b.text.localeCompare(a.text);
      }
    });
    setPosts(sortedPosts);
    setSortOrder(order);
  };

  const filteredPosts = posts.filter(post => post.text.toLowerCase().includes(searchTerm.toLowerCase()));

  const getDescriptionClass = (text) => {
    const length = text.split(' ').length;
    if (length < 5) {
      return 'short-description';
    } else if (length <= 20) {
      return 'medium-description';
    } else {
      return 'long-description';
    }
  };

  const getStatistics = () => {
    const totalPosts = posts.length;
    const shortDescriptions = posts.filter(post => post.text.split(' ').length < 5).length;
    const mediumDescriptions = posts.filter(post => post.text.split(' ').length >= 5 && post.text.split(' ').length <= 20).length;
    const longDescriptions = posts.filter(post => post.text.split(' ').length > 20).length;
    return { totalPosts, shortDescriptions, mediumDescriptions, longDescriptions };
  };

  const { totalPosts, shortDescriptions, mediumDescriptions, longDescriptions } = getStatistics();

  return (
    <div className="App">
      <aside className="App-sidebar">
        <div className="sidebar-item">
          Main Screen
        </div>
        <div className="sidebar-item">
          Explore
          <i className="fas fa-search" onClick={() => setSearchTerm('')}></i>
        </div>
        <div className="sidebar-item">
          Notifications
        </div>
        <div className="sidebar-item">
          Messages
        </div>
      </aside>
      <main className="App-main">
        <div className="buttons">
          <button onClick={() => setModalIsOpen(true)}>Add Post</button>
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
        {filteredPosts.map(post => (
          <div key={post.id} className="post">
            <div className="post-menu">
              <button onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)}>⋮</button>
              {menuOpen === post.id && (
                <div className="post-menu-options">
                  <button onClick={() => editPost(post.id)}>Edit</button>
                  <button onClick={() => deletePost(post.id)}>Delete</button>
                </div>
              )}
            </div>
            <p className={getDescriptionClass(post.text)}>{post.text}</p>
            <p className="post-date">{post.date}</p>
            <img src={post.img} alt="Post" />
          </div>
        ))}
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
      </aside>
      <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)}>
        <h2>Add a new post</h2>
        <form onSubmit={(e) => { e.preventDefault(); addPost(); }}>
          <label>
            Image URL:
            <input type="text" placeholder="Enter image URL" value={newPostImg} onChange={(e) => setNewPostImg(e.target.value)} required />
          </label>
          <label>
            Description:
            <input type="text" placeholder="Enter description" value={newPostText} onChange={(e) => setNewPostText(e.target.value)} required />
          </label>
          <button type="submit">Submit Post</button>
          <button type="button" onClick={() => setModalIsOpen(false)}>Cancel</button>
        </form>
      </Modal>
    </div>
  );
}

export default App;