import { ProcessorDTO } from 'chaite'
import { SqlKvStorage, parseJson, stringifyJson } from '../sql_storage.js'
import { stampTimestamps } from './channel_storage.js'

const spec = {
  table: 'processors',
  columns: {
    id: { type: 'text', pk: true },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    type: { type: 'text', notNull: true },
    code: { type: 'text' },
    cloudId: { type: 'int' },
    createdAt: { type: 'text' },
    updatedAt: { type: 'text' },
    md5: { type: 'text' },
    embedded: { type: 'bool', default: 0 },
    uploader: { type: 'json' },
    extraData: { type: 'json' }
  },
  indexes: [
    { columns: ['type'] }
  ],
  filterable: ['id', 'name', 'description', 'type', 'cloudId', 'md5', 'embedded'],
  boolean: ['embedded'],
  toRecord (processor, id) {
    const {
      id: _ignored, name, description, type, code, cloudId,
      createdAt, updatedAt, md5, embedded, uploader, ...rest
    } = processor

    return {
      id,
      name: name || '',
      description: description || '',
      // 'pre' 或 'post'
      type: type || '',
      code: code || '',
      cloudId: cloudId || null,
      createdAt: createdAt || '',
      updatedAt: updatedAt || '',
      md5: md5 || '',
      embedded: embedded ? 1 : 0,
      uploader: stringifyJson(uploader),
      extraData: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null
    }
  },
  fromRecord (record) {
    if (!record) return null
    return new ProcessorDTO({
      id: record.id,
      name: record.name,
      description: record.description,
      type: record.type,
      code: record.code,
      cloudId: record.cloudId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      md5: record.md5,
      embedded: Boolean(record.embedded),
      uploader: parseJson(record.uploader, null),
      ...parseJson(record.extraData, {})
    })
  }
}

/**
 * @extends {SqlKvStorage<import('chaite').ProcessorDTO>}
 */
export class SqlProcessorsStorage extends SqlKvStorage {
  constructor (driver) {
    super(driver, spec)
  }

  getName () { return 'SqlProcessorsStorage' }

  async setItem (id, processor) {
    stampTimestamps(processor)
    return super.setItem(id, processor)
  }
}

export { spec as processorsSpec }
