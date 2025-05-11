const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const { User, Post, Tag, PostTag } = require('../models');
const { sequelize } = require('../models');

async function generateUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    users.push({
      username: faker.internet.username(),
      email: faker.internet.email(),
      password: hashedPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      isAdmin: false,
      lastLogin: faker.date.recent()
    });
  }
  return User.bulkCreate(users);
}


async function generateTags(count) {
  const tags = [];
  const usedNames = new Set();
  while (tags.length < count) {
    const name = faker.word.noun();
    if (!usedNames.has(name)) {
      usedNames.add(name);
      tags.push({
        name,
        description: faker.lorem.sentence()
      });
    }
  }
  return Tag.bulkCreate(tags);
}

async function generatePosts(count, userIds) {
  const posts = [];
  for (let i = 0; i < count; i++) {
    posts.push({
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(3),
      userId: faker.helpers.arrayElement(userIds),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent()
    });
  }
  return Post.bulkCreate(posts);
}

async function generatePostTags(posts, tags) {
  const postTags = [];
  for (const post of posts) {
    const numTags = faker.number.int({ min: 1, max: 5 });
    const selectedTags = faker.helpers.arrayElements(tags, numTags);
    
    for (const tag of selectedTags) {
      postTags.push({
        postId: post.id,
        tagId: tag.id
      });
    }
  }
  return PostTag.bulkCreate(postTags);
}

async function generateData() {
  try {
    console.log('Starting data generation...');
    
    // Generate 10,000 users
    console.log('Generating users...');
    const users = await generateUsers(200);
    console.log(`Generated ${users.length} users`);
    
    // Generate 1,000 tags
    console.log('Generating tags...');
    const tags = await generateTags(200);
    console.log(`Generated ${tags.length} tags`);
    
    // Generate 100,000 posts
    console.log('Generating posts...');
    const userIds = users.map(user => user.id);
    const posts = await generatePosts(200, userIds);
    console.log(`Generated ${posts.length} posts`);
    
    // Generate post-tag relationships
    console.log('Generating post-tag relationships...');
    const postTags = await generatePostTags(posts, tags);
    console.log(`Generated ${postTags.length} post-tag relationships`);
    
    console.log('Data generation completed successfully!');
  } catch (error) {
    console.error('Error generating data:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the data generation
generateData(); 