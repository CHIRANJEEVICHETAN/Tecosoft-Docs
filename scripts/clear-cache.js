#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file)
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath)
      } else {
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(folderPath)
  }
}

console.log('🧹 Clearing Next.js cache...')

// Clear .next folder
const nextFolder = path.join(process.cwd(), '.next')
if (fs.existsSync(nextFolder)) {
  deleteFolderRecursive(nextFolder)
  console.log('✅ Cleared .next folder')
}

// Clear node_modules/.cache if it exists
const cacheFolder = path.join(process.cwd(), 'node_modules', '.cache')
if (fs.existsSync(cacheFolder)) {
  deleteFolderRecursive(cacheFolder)
  console.log('✅ Cleared node_modules/.cache folder')
}

console.log('🎉 Cache cleared successfully!')
console.log('💡 Now restart your development server with: npm run dev')