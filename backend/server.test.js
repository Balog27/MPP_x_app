const request = require('supertest');
const app = require('./server');

// Set even longer timeout
jest.setTimeout(60000);

describe('Backend API Tests', () => {
  let postId;

  // Test Add Operation
  it('should add a new post', async () => {
    const newPost = {
      text: 'Test Post',
      img: 'https://example.com/image.jpg',
    };

    const response = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Accept', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.text).toBe(newPost.text);
    expect(response.body.img).toBe(newPost.img);

    postId = response.body.id; // Save the ID for later tests
    console.log('Created post with ID:', postId);
  });

  // Test Edit Operation
  it('should edit an existing post', async () => {
    const updatedPost = {
      text: 'Updated Test Post',
      img: 'https://example.com/updated-image.jpg',
    };

    const response = await request(app)
      .put(`/posts/${postId}`)
      .send(updatedPost)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.text).toBe(updatedPost.text);
    expect(response.body.img).toBe(updatedPost.img);
  });

  // Test Delete Operation
  it('should delete a post', async () => {
    const response = await request(app)
      .delete(`/posts/${postId}`)
      .set('Accept', 'application/json');

    expect(response.status).toBe(204);
  });

  // Test Sort Operation
  it('should return posts sorted in ascending order', async () => {
    const response = await request(app)
      .get('/posts?sort=asc')
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);

    // Check if posts are sorted
    const isSorted = response.body.every((post, index, array) => {
      return index === 0 || post.text >= array[index - 1].text;
    });
    expect(isSorted).toBe(true);
  });
});