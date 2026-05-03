import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { Fingerprint, Proxy } from '../shared/types'

export interface ProfileTemplate {
  name: string
  description: string
  icon: string
  fingerprint: Fingerprint
  proxy: Proxy
}

const TEMPLATE_FILES = [
  'facebook.json',
  'google.json',
  'amazon.json',
  'tiktok.json',
  'instagram.json'
]

// Get templates directory path
function getTemplatesDir(): string {
  // In development: resources/templates
  // In production: app.asar/resources/templates
  return join(__dirname, '../../resources/templates')
}

// Load all built-in templates
export function getTemplates(): ProfileTemplate[] {
  const templates: ProfileTemplate[] = []
  const templatesDir = getTemplatesDir()
  
  for (const file of TEMPLATE_FILES) {
    try {
      const filePath = join(templatesDir, file)
      const content = readFileSync(filePath, 'utf-8')
      const template = JSON.parse(content) as ProfileTemplate
      templates.push(template)
    } catch (error) {
      console.error(`Failed to load template ${file}:`, error)
    }
  }
  
  return templates
}

// Get template by name
export function getTemplate(name: string): ProfileTemplate | null {
  const templates = getTemplates()
  return templates.find(t => t.name.toLowerCase() === name.toLowerCase()) || null
}

// Get custom templates directory
function getCustomTemplatesDir(): string {
  return join(app.getPath('userData'), 'custom-templates')
}

// Load custom templates
export function getCustomTemplates(): ProfileTemplate[] {
  const templates: ProfileTemplate[] = []
  const customDir = getCustomTemplatesDir()
  
  if (!existsSync(customDir)) {
    return templates
  }
  
  try {
    const fs = require('fs')
    const files = fs.readdirSync(customDir)
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = join(customDir, file)
          const content = readFileSync(filePath, 'utf-8')
          const template = JSON.parse(content) as ProfileTemplate
          templates.push(template)
        } catch (error) {
          console.error(`Failed to load custom template ${file}:`, error)
        }
      }
    }
  } catch (error) {
    console.error('Failed to read custom templates directory:', error)
  }
  
  return templates
}

// Get all templates (built-in + custom)
export function getAllTemplates(): ProfileTemplate[] {
  return [...getTemplates(), ...getCustomTemplates()]
}

// Save custom template
export function saveCustomTemplate(template: ProfileTemplate): void {
  const customDir = getCustomTemplatesDir()
  
  if (!existsSync(customDir)) {
    mkdirSync(customDir, { recursive: true })
  }
  
  const fileName = template.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.json'
  const filePath = join(customDir, fileName)
  
  writeFileSync(filePath, JSON.stringify(template, null, 2))
}

// Delete custom template
export function deleteCustomTemplate(name: string): void {
  const customDir = getCustomTemplatesDir()
  const fileName = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.json'
  const filePath = join(customDir, fileName)
  
  if (existsSync(filePath)) {
    const fs = require('fs')
    fs.unlinkSync(filePath)
  }
}

// Export template to file
export function exportTemplate(template: ProfileTemplate, filePath: string): void {
  writeFileSync(filePath, JSON.stringify(template, null, 2))
}

// Import template from file
export function importTemplate(filePath: string): ProfileTemplate {
  const content = readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as ProfileTemplate
}
