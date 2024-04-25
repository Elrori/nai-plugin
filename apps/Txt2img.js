import plugin from '../../../lib/plugins/plugin.js'
import { handleParam } from '../utils/parse.js'
import { url2Base64 } from '../utils/utils.js'
import queue from '../components/Queue.js'
import moment from "moment";
import {
  checkUsageLimit_day,
  readYaml,
  addUsage,
  clearCD,
  Config_yaml
} from '../utils/paimonNaiControl.js'

export class txt2img extends plugin {
  constructor() {
    super({
      /** 功能名称 */
      name: 'nai-绘画',
      /** 功能描述 */
      dsc: '绘画',
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: 1009,
      rule: [
        {
          /** 命令正则匹配 */
          reg: '^(/|#|n)(绘画|画图|ai3)([\\s\\S]*)$',
          /** 执行方法 */
          fnc: 'txt2img'
        }
      ]
    })
  }

  async txt2img(e) {
    if (queue.list.length === 0) return e.reply('当前队列中的可用Token为空，请先添加Token/使用【#刷新Token】指令刷新已经配置的Token')

    // 读取config_yaml----------------------------------------------------
    let config_yaml = readYaml(Config_yaml)
    if (!config_yaml) logger.error('无法读取config_yaml')
    if (!config_yaml.paimon_nai_turnOn) return
    let cd_time = config_yaml.CD_all
    let usageLimit_day = await checkUsageLimit_day(e.user_id, 0)
    let nai_unlimited_users = config_yaml.nai_unlimited_users
    let currentTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    // 判断个人CD  
    let lastTime = await redis.get(`Yz:PaimongNai:${e.group_id}:${e.user_id}`);
    if (lastTime && !e.isMaster && nai_unlimited_users.indexOf(e.user_id) == -1) {
      let seconds = moment(currentTime).diff(moment(lastTime), "seconds");
      if ((cd_time - seconds) <= 0) {
        await clearCD(e)
        return await e.reply(`派蒙数据库错误，已尝试修复，请重试`, false, { recallMsg: 30 });
      }
      return await e.reply(`${cd_time}秒个人cd，请等待${cd_time - seconds}秒后再使用`, false, { recallMsg: 15 });
    }
    // 判断次数限制
    let usageLimit = e.isMaster || nai_unlimited_users.indexOf(e.user_id) > -1 ? 0 : usageLimit_day;
    let used = await redis.get(`Yz:PaimongNai:Usage:${e.user_id}`) || 0;
    let remainingTimes = usageLimit - used;//今日剩余次数
    if (remainingTimes < 0) remainingTimes = 0;
    if (usageLimit) {
      // 剩余可用次数
      if (remainingTimes <= 0)
        return await e.reply(`你今天已经绘制过${used}张图片了，请明天再来~`, false, { recallMsg: 15 });
    }
    // 根据设置判断用户能否更改绘图参数/违禁词判断
    if (!e.isMaster) {
      // 非master不允许使用敏感TAG
      let data = readYaml(Config_yaml)
      if (data.nai_unsafewords) {
        const nsfwpattern = new RegExp(data.nai_unsafewords, "i");
        const nsfwmatch   = nsfwpattern.exec(e.msg);
        if (nsfwmatch) {
          await common.sleep(1000)
          //await e.group.muteMember(e.user_id, 60 * 2);
          await common.sleep(5000)
          return await e.reply(`┭┮﹏┭┮不能再画涩涩的相片了:${nsfwmatch[0]} `,false, { recallMsg: 60 }); //${nsfwmatch[0]}
        }
      }
      // 非master不允许修改步数
      const pattern = /步数\s?(\d+)|(\d{2,7})[\*×](\d{2,7})/i;
      const match = pattern.exec(e.msg);
      if (match) {
        return await e.reply(`${e.user_id}┭┮﹏┭┮不能修改绘画参数“${match[0]}”`);
      }
    }
    e = await parseSourceImg(e)
    // END ---------------------------------------------------------



    let msg = e.msg.replace(/^\/绘画|^\/画图|^#绘画|^#画图|^nai3/, '')
    if (msg === '帮助') {
      return false
    }
    const data = {
      msg: e.msg,
      img: e.img ? e.img : null,
      type: 'txt2img'
    };
    await redis.set(`nai:again:${e.user_id}`, JSON.stringify(data));
    let param = await handleParam(e, msg)
    if (e.img) {
      param.parameters.reference_image = await url2Base64(e.img[0])
    }
    let restNumber = await queue.enqueue({
      e: e,
      param: param,
      user: e.user_id,
      type: 'txt2img'
    })
    e.reply(`${param.parameters.reference_image ? '[已上传参考图片] ' : ''} ${e.user_id}今日剩余${remainingTimes}次，当前队列还有${restNumber}人，大概还需要${14 * (restNumber + 1)}秒完成`, false, { recallMsg: 30 })
    
    // 写入cd---------------------------------------------------------
    currentTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    redis.set(`Yz:PaimongNai:${e.group_id}:${e.user_id}`, currentTime, { EX: cd_time });
    // 增加次数
    addUsage(e.user_id, 1); 
    // 写入cd END-----------------------------------------------------
    
    return true
  }
}


/**
 * @description: 处理消息中的图片：当消息引用了图片，则将对应图片放入e.img ，优先级==> e.source.img > e.img
 * @param {*} e
 * @return {*}处理过后的e
 */
async function parseSourceImg(e) {
  if (e.source) {
      let reply;
      if (e.isGroup) {
          reply = (await e.group.getChatHistory(e.source.seq, 1)).pop()?.message;
      } else {
          reply = (await e.friend.getChatHistory(e.source.time, 1)).pop()?.message;
      }
      if (reply) {
          for (const val of reply) {
              if (val.type == "image") {
                  e.img = [val.url];
                  break;
              }
              if (val.type == "file") {
                  e.reply("不支持消息中的文件，请以图片发送");
                  return;
              }
          }
      }
  }
  return e;
}