const { Tag, Post } = require('../models');

async function seedTags() {
  try {
    // Create sample tags
    const tags = [
      {
        name: 'Technology',
        color: '#3498db',
        description: 'Posts about technology, software, and gadgets',
        isPopular: true
      },
      {
        name: 'Design',
        color: '#9b59b6',
        description: 'Posts about UI/UX design, graphic design, and creativity',
        isPopular: true
      },
      {
        name: 'Business',
        color: '#f1c40f',
        description: 'Posts about business strategies, entrepreneurship, and management',
        isPopular: false
      },
      {
        name: 'Health',
        color: '#2ecc71',
        description: 'Posts about health, fitness, and wellness',
        isPopular: true
      },
      {
        name: 'Travel',
        color: '#e74c3c',
        description: 'Posts about travel adventures, destinations, and tips',
        isPopular: true
      }
    ];

    // Insert the tags
    const createdTags = await Tag.bulkCreate(tags);
    console.log('✅ Tags seeded successfully!');
    
    // Find some existing posts to associate with tags
    const posts = await Post.findAll({ limit: 5 });
    
    if (posts.length > 0) {
      // Associate each post with 1-3 random tags
      for (const post of posts) {
        // Shuffle and pick random tags
        const shuffledTags = [...createdTags].sort(() => 0.5 - Math.random());
        const randomCount = Math.floor(Math.random() * 3) + 1; // 1-3 tags
        const selectedTags = shuffledTags.slice(0, randomCount);
        
        await post.addTags(selectedTags);
      }
      console.log('✅ Post-Tag relationships seeded successfully!');
    }
  } catch (error) {
    console.error('❌ Error seeding tags:', error);
  }
}

// Run the seeder if called directly
if (require.main === module) {
  // Import the database connection
  const db = require('../models');
  
  // Sync the database and run the seeder
  db.sequelize.sync()
    .then(() => {
      console.log('Database synced');
      return seedTags();
    })
    .then(() => {
      console.log('Tag seeding completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = seedTags;