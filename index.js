import fs from 'node:fs'

if (!global.segment) {
  global.segment = (await import("oicq")).segment
}

let ret = []

logger.info(logger.yellow("- 正在载入 NAI-PLUGIN"))

const files = fs
  .readdirSync('./plugins/nai-plugin/apps')
  .filter((file) => file.endsWith('.js'))

  files.forEach((file) => {
    ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')
  
  if (ret[i].status != 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
    }
    apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

logger.info(logger.green("- NAI-PLUGIN 载入成功"))

export { apps }