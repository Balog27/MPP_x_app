const { faker } = require('@faker-js/faker');
const { User, Post, Tag, sequelize } = require('../models');
const ProgressBar = require('progress');

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit here, let the script handle errors
});

// Configuration - adjust these values as needed

let TOTAL_USERS = 50;
let TOTAL_POSTS = 200;
let TOTAL_TAGS = 10;
let BATCH_SIZE = 50;

async function generateMassiveData() {
  console.log('Starting massive data generation...');
  
  // Use a transaction for data consistency
  const t = await sequelize.transaction();
  
  try {
    // 1. Generate Tags
    console.log(`\nGenerating ${TOTAL_TAGS} tags...`);
    const tagBar = new ProgressBar(':bar :current/:total (:percent)', { total: TOTAL_TAGS, width: 40 });
    
    const tags = [];
    for (let i = 0; i < TOTAL_TAGS; i++) {
      tags.push({
        name: faker.word.noun() + ' ' + faker.number.int({ min: 1, max: 999 }),
        color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
        description: faker.lorem.sentence(),
        isPopular: Math.random() > 0.7, // 30% chance to be popular
        createdAt: new Date(),
        updatedAt: new Date()
      });
      tagBar.tick();
    }
    
    console.log('Inserting tags into database...');
    const createdTags = await Tag.bulkCreate(tags, { transaction: t });
    console.log(`Created ${createdTags.length} tags.`);
    
    // 2. Generate Users
    console.log(`\nGenerating ${TOTAL_USERS} users...`);
    const userBar = new ProgressBar(':bar :current/:total (:percent)', { total: TOTAL_USERS, width: 40 });
    
    const users = [];
    for (let i = 0; i < TOTAL_USERS; i++) {
      users.push({
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        isAdmin: Math.random() > 0.9, // 10% chance to be admin
        lastLogin: faker.date.past(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      userBar.tick();
    }
    
    console.log('Inserting users into database...');
    const createdUsers = await User.bulkCreate(users, { transaction: t });
    console.log(`Created ${createdUsers.length} users.`);
    
    // 3. Generate Posts in batches
    console.log(`\nGenerating ${TOTAL_POSTS} posts in batches of ${BATCH_SIZE}...`);
    const batchCount = Math.ceil(TOTAL_POSTS / BATCH_SIZE);
    const postBar = new ProgressBar(':bar :current/:total batches (:percent)', { total: batchCount, width: 40 });
    
    let totalPostsCreated = 0;
    
    for (let batch = 0; batch < batchCount; batch++) {
      const postsToCreate = Math.min(BATCH_SIZE, TOTAL_POSTS - totalPostsCreated);
      const posts = [];
      
      for (let i = 0; i < postsToCreate; i++) {
        const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        const createdAt = faker.date.between({ from: '2023-01-01', to: new Date() });
        
        posts.push({
          title: faker.lorem.sentence().slice(0, 100),
          content: faker.lorem.paragraphs(3),
          imageUrl: Math.random() > 0.7 ? faker.image.url() : null,
          isVideo: Math.random() > 0.9,
          status: faker.helpers.arrayElement(['draft', 'published', 'archived']),
          viewCount: faker.number.int({ min: 0, max: 10000 }),
          userId: randomUser.id,
          createdAt,
          updatedAt: createdAt
        });
      }
      
      const createdBatchPosts = await Post.bulkCreate(posts, { transaction: t });
      totalPostsCreated += createdBatchPosts.length;
      
      // Associate tags with posts
      console.log(`Associating tags with batch ${batch + 1}/${batchCount}...`);
      for (const post of createdBatchPosts) {
        const tagsToAssociate = Math.floor(Math.random() * 4) + 1; // 1-4 tags per post
        const shuffledTags = [...createdTags].sort(() => 0.5 - Math.random());
        const selectedTags = shuffledTags.slice(0, tagsToAssociate);
        
        await post.addTags(selectedTags, { transaction: t });
      }
      
      postBar.tick();
      console.log(`Batch ${batch + 1}/${batchCount} completed. Total posts created: ${totalPostsCreated}`);
    }
    
    console.log(`\nData generation completed successfully! Created:`);
    console.log(`- ${createdUsers.length} users`);
    console.log(`- ${totalPostsCreated} posts`);
    console.log(`- ${createdTags.length} tags`);
    
    // Commit the transaction at the end
    await t.commit();
    
    return {
      users: createdUsers.length,
      posts: totalPostsCreated,
      tags: createdTags.length
    };
  } catch (error) {
    // Rollback on error
    await t.rollback();
    console.error('Error generating data:');
    console.error(error);
    throw error;
  }
}

// Only run this function if this script is executed directly
if (require.main === module) {
  console.log('===== MASSIVE DATA GENERATOR =====');
  
  // Get command line args
  const args = process.argv.slice(2);
  const smallRun = args.includes('--small');
  
  if (smallRun) {
    console.log('Running in SMALL mode (fewer records)');
    // Override the constants for a small run
    TOTAL_USERS = 5;
    TOTAL_POSTS = 10;
    TOTAL_TAGS = 3;
    BATCH_SIZE = 10;
  }
  
  generateMassiveData()
    .then((stats) => {
      console.log('\nData generation completed successfully!');
      console.log('Statistics:', stats);
      
      // Make sure to close connection cleanly
      return sequelize.close();
    })
    .then(() => {
      console.log('Database connection closed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('\nFailed to generate data:', error);
      // Still need to close connection on error
      sequelize.close()
        .then(() => process.exit(1))
        .catch(() => process.exit(1));
    });
}

module.exports = generateMassiveData;