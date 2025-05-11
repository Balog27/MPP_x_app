const { faker } = require('@faker-js/faker');
const { User, Post, Tag, sequelize } = require('../models');

async function testSmallDataGeneration() {
  console.log('Testing data generation with small numbers...');
  
  try {
    // Create 1 user
    console.log('Creating test user...');
    const user = await User.create({
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Created user:', user.id);
    
    // Create 1 tag
    console.log('Creating test tag...');
    const tag = await Tag.create({
      name: 'Test Tag',
      color: '#FF5733',
      description: 'A test tag',
      isPopular: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Created tag:', tag.id);
    
    // Create 1 post
    console.log('Creating test post...');
    const post = await Post.create({
      title: 'Test Post',
      content: 'This is a test post content',
      status: 'published',
      viewCount: 10,
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Created post:', post.id);
    
    // Associate post with tag
    console.log('Associating post with tag...');
    await post.addTag(tag);
    console.log('Association created successfully');
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testSmallDataGeneration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });