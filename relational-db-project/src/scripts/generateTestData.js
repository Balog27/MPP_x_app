const { faker } = require('@faker-js/faker');
const { User, Post, Tag, sequelize } = require('../models');
const cliProgress = require('cli-progress');
const colors = require('ansi-colors');

// Configuration
const TOTAL_USERS = 10000;
const TOTAL_TAGS = 1000;
const TOTAL_POSTS = 100000;
const BATCH_SIZE = 1000; // Insert records in batches for better performance

async function generateTestData() {
  console.log('🚀 Starting database data generation...');
  
  // Create progress bars
  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: '{bar} | {percentage}% | {value}/{total} | {task}'
  }, cliProgress.Presets.shades_classic);

  const userBar = multibar.create(TOTAL_USERS, 0, { task: colors.cyan('Users') });
  const tagBar = multibar.create(TOTAL_TAGS, 0, { task: colors.green('Tags') });
  const postBar = multibar.create(TOTAL_POSTS, 0, { task: colors.yellow('Posts') });
  const relationBar = multibar.create(TOTAL_POSTS, 0, { task: colors.magenta('Post-Tag Relations') });

  try {
    // Generate Users
    console.log('\n📊 Generating users...');
    const usersBatches = Math.ceil(TOTAL_USERS / BATCH_SIZE);
    
    for(let b = 0; b < usersBatches; b++) {
      const usersToCreate = [];
      const batchSize = Math.min(BATCH_SIZE, TOTAL_USERS - b * BATCH_SIZE);
      
      for(let i = 0; i < batchSize; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const username = faker.internet.userName({ firstName, lastName }) + '_' + faker.string.alphanumeric(5);
        
        usersToCreate.push({
          username,
          email: faker.internet.email({ firstName, lastName }),
          password: faker.internet.password({ length: 12 }),
          firstName,
          lastName,
          isAdmin: faker.datatype.boolean({ probability: 0.05 }), // 5% are admins
          lastLogin: faker.date.recent({ days: 30 }),
          createdAt: faker.date.past({ years: 2 }),
          updatedAt: faker.date.recent({ days: 90 })
        });
      }
      
      await User.bulkCreate(usersToCreate);
      userBar.update((b+1) * batchSize > TOTAL_USERS ? TOTAL_USERS : (b+1) * batchSize);
    }

    // Generate Tags
    console.log('\n📊 Generating tags...');
    const tagsBatches = Math.ceil(TOTAL_TAGS / BATCH_SIZE);
    
    for(let b = 0; b < tagsBatches; b++) {
      const tagsToCreate = [];
      const batchSize = Math.min(BATCH_SIZE, TOTAL_TAGS - b * BATCH_SIZE);
      
      for(let i = 0; i < batchSize; i++) {
        tagsToCreate.push({
          name: faker.word.sample() + '_' + faker.string.alphanumeric(5), // Ensure uniqueness
          color: faker.internet.color(),
          description: faker.lorem.sentence(),
          isPopular: faker.datatype.boolean({ probability: 0.2 }), // 20% are popular
          createdAt: faker.date.past({ years: 2 }),
          updatedAt: faker.date.recent({ days: 90 })
        });
      }
      
      await Tag.bulkCreate(tagsToCreate);
      tagBar.update((b+1) * batchSize > TOTAL_TAGS ? TOTAL_TAGS : (b+1) * batchSize);
    }

    // Get all user and tag IDs for reference
    const userIds = (await User.findAll({ attributes: ['id'] })).map(user => user.id);
    const tagIds = (await Tag.findAll({ attributes: ['id'] })).map(tag => tag.id);
    
    // Generate Posts with Tags
    console.log('\n📊 Generating posts and tag relationships...');
    const postsBatches = Math.ceil(TOTAL_POSTS / BATCH_SIZE);
    
    for(let b = 0; b < postsBatches; b++) {
      const postsToCreate = [];
      const postTagsToCreate = [];
      const batchSize = Math.min(BATCH_SIZE, TOTAL_POSTS - b * BATCH_SIZE);
      
      for(let i = 0; i < batchSize; i++) {
        // Prepare post data
        const postId = b * BATCH_SIZE + i + 1; // Approximate post ID (may not be accurate but helps with progress)
        const createdAt = faker.date.past({ years: 2 });
        
        postsToCreate.push({
          title: faker.lorem.sentence({ min: 3, max: 8 }),
          content: faker.lorem.paragraphs({ min: 1, max: 10 }),
          imageUrl: Math.random() > 0.7 ? faker.image.url() : null, // 30% have images
          isVideo: Math.random() > 0.9, // 10% are videos
          status: faker.helpers.arrayElement(['published', 'published', 'published', 'draft', 'archived']), // 60% published, 20% draft, 20% archived
          viewCount: faker.number.int({ min: 0, max: 10000 }),
          userId: faker.helpers.arrayElement(userIds),
          createdAt,
          updatedAt: faker.date.between({ from: createdAt, to: new Date() })
        });
        
        // Prepare post-tag relationships (each post has 1-5 tags)
        const tagCount = faker.number.int({ min: 1, max: 5 });
        const selectedTagIds = faker.helpers.arrayElements(tagIds, tagCount);
        
        selectedTagIds.forEach(tagId => {
          postTagsToCreate.push({
            postId,
            tagId,
            createdAt: createdAt,
            updatedAt: createdAt
          });
        });
      }
      
      // Create posts
      await Post.bulkCreate(postsToCreate);
      postBar.update((b+1) * batchSize > TOTAL_POSTS ? TOTAL_POSTS : (b+1) * batchSize);
      
      // Find the actual IDs of the posts we just created
      const startId = b * BATCH_SIZE + 1;
      const endId = (b+1) * BATCH_SIZE;
      const actualPostIds = (await Post.findAll({
        attributes: ['id'],
        order: [['id', 'ASC']],
        where: { id: { [sequelize.Op.between]: [startId, endId] } }
      })).map(post => post.id);
      
      // Update the postId in the relationships
      const fixedPostTagsToCreate = [];
      let relationCounter = 0;
      
      for (let i = 0; i < postsToCreate.length; i++) {
        const postId = actualPostIds[i];
        const tagCount = postTagsToCreate.filter(pt => pt.postId === (b * BATCH_SIZE + i + 1)).length;
        
        // Get the tag IDs for this post
        for (let j = 0; j < tagCount; j++) {
          const index = relationCounter++;
          if (index < postTagsToCreate.length) {
            fixedPostTagsToCreate.push({
              ...postTagsToCreate[index],
              postId
            });
          }
        }
      }
      
      // Create post-tag relationships in batches
      const relationBatchSize = 5000;
      const relationBatches = Math.ceil(fixedPostTagsToCreate.length / relationBatchSize);
      
      for (let rb = 0; rb < relationBatches; rb++) {
        const batchStart = rb * relationBatchSize;
        const batchEnd = Math.min((rb + 1) * relationBatchSize, fixedPostTagsToCreate.length);
        const batch = fixedPostTagsToCreate.slice(batchStart, batchEnd);
        
        try {
          await sequelize.models.PostTag.bulkCreate(batch, { ignoreDuplicates: true });
        } catch (error) {
          console.error(`Error creating PostTag relations batch ${rb}:`, error.message);
        }
        
        relationBar.update((b * BATCH_SIZE) + batchEnd > TOTAL_POSTS ? TOTAL_POSTS : (b * BATCH_SIZE) + batchEnd);
      }
    }

    multibar.stop();
    console.log('\n✅ Data generation completed successfully!');
    console.log(`Generated: ${TOTAL_USERS} Users, ${TOTAL_TAGS} Tags, ${TOTAL_POSTS} Posts`);

  } catch (error) {
    multibar.stop();
    console.error('\n❌ Error generating test data:', error);
    throw error;
  }
}

// If this script is run directly (not required)
if (require.main === module) {
  // First install the necessary dependencies:
  // npm install @faker-js/faker cli-progress ansi-colors
  
  console.log('Starting data generation...');
  generateTestData()
    .then(() => {
      console.log('Data generation completed successfully.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error during data generation:', error);
      process.exit(1);
    });
}

module.exports = generateTestData;