import sharp from 'sharp'

await sharp('public/favicon.svg').resize(192, 192).png().toFile('public/icon-192.png')
await sharp('public/favicon.svg').resize(512, 512).png().toFile('public/icon-512.png')
console.log('✓ public/icon-192.png')
console.log('✓ public/icon-512.png')
