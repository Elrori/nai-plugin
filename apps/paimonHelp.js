import plugin from '../../../lib/plugins/plugin.js';
import common from '../../../lib/common/common.js';
import cfg from '../../../lib/config/config.js'
import queue from '../components/Queue.js'
import axios from 'axios'
import { client } from "@gradio/client";
import {
    checkUsageLimit_day,
    readYaml,
    writeYaml,
    updateConfig,
    Config_yaml
} from '../utils/paimonNaiControl.js'

export class paimonnaihelp extends plugin {
    constructor() {
        super({
            name: '派蒙nai帮助',
            dsc: '派蒙nai帮助',
            event: 'message',
            priority: 999,
            rule: [
                {
                    reg: '^(/|#)派蒙nai帮助',
                    fnc: 'paimon_nai_help',
                },
                {
                    reg: '^(/|#)派蒙nai设置使用接口',
                    fnc: 'paimon_nai_set_use_token',
                    permission: 'master'
                },
                {
                    reg: '^(/|#)派蒙nai绘画(开启|关闭)$',
                    fnc: 'paimon_nai_turnOn',
                    permission: 'master'
                },
                {
                    reg: '^(/|#)派蒙nai设置CD',
                    fnc: 'paimon_nai_set_CD_all',
                    permission: 'master'
                },
                {
                    reg: '^(/|#)派蒙nai设置每日次数限制',
                    fnc: 'paimon_nai_set_usageLimit_day',
                    permission: 'master'
                },
                {
                    reg: '^(/|#)派蒙nai(设置|删除)无限制人员(QQ|qq)',
                    fnc: 'paimon_nai_set_unlimited_users',
                    permission: 'master'
                },
                {
                    reg: '^(/|#)派蒙nai查看无限制人员(QQ|qq)$',
                    fnc: 'paimon_nai_unlimited_users_lists',
                    permission: 'master'
                },
                {
                    reg: '^(/|#)派蒙nai增加(QQ|qq)?([0-9]*)次数([0-9]*)(次)?',
                    fnc: 'paimon_nai_add_usageLimit_today',
                    permission: 'master'
                },
                {
                    reg: '^(/|#)派蒙nai清空队列$',
                    fnc: 'paimon_nai_clearNaiQueue',
                    permission: 'master'
                },
                {
                    reg: '^(/|#)派蒙nai设置鉴黄阈值',
                    fnc: 'paimon_nai_setTh',
                    permission: 'master'
                },
                {
                    reg: '^(/|#)派蒙nai设置鉴黄开关',
                    fnc: 'paimon_nai_setThOn',
                    permission: 'master'
                },
                {
                    reg: '^(/|#)派蒙nai添加违禁词',
                    fnc: 'paimon_nai_addUnsafeTag',
                    permission: 'master'
                },
                {
                    reg: '^(/|#)解析(png|PNG)?$',
                    fnc: 'getPngInfo',
                },
                {
                    reg: '^(/|#)鉴赏(png|PNG)?$',
                    fnc: 'getAppreciate',
                },
            ]
        })
    }


    /**^#派蒙nai帮助 */
    async paimon_nai_help(e) {
        let input_v = e.msg.replace(/^#派蒙nai帮助/, '').trim()
        let msg1 = '小呆毛NAI绘画指令：' +
            '\n#绘画 1girl,smea,dyn,ucp=heavy,ntags=nsfw,' +
            '\nnai3   1girl,smea,dyn,ucp=heavy,ntags=nsfw,' +
            '\n#重画[重复上次绘画]' +
            '\nre    [重复上次绘画]' +
            '\n#解析[解析引用图片的png信息]' +
            '\n#鉴赏[使用deepdanbooru反推图片TAG信息]' +
            ''
        let msg2 = '#派蒙nai设置使用接口[num]\n 默认为0' +
            '\n#派蒙nai绘画(开启|关闭)' +
            '\n#派蒙nai设置CD[num]' +
            '\n#派蒙nai设置每日次数限制[num]' +
            '\n#派蒙nai设置无限制人员qq[num/@at]' +
            '\n#派蒙nai删除无限制人员qq[num/@at]' +
            '\n#派蒙nai查看无限制人员qq' +
            '\n#派蒙nai增加qq[num/@at]次数[num]次' +
            '\n#派蒙nai清空队列' +
            '\n#派蒙nai添加违禁词[1word]' +
            '\n#派蒙nai设置鉴黄阈值[0~1]  越接近1审查越宽松' +
            '\n#派蒙nai设置鉴黄开关[0|1]' +
            ''
        let msgx

        if (!e.isMaster) msgx = await common.makeForwardMsg(e, [msg1], `派蒙nai帮助`)
        else msgx = await common.makeForwardMsg(e, [msg1, msg2], `派蒙nai帮助-m`)

        e.reply(msgx);
        return true;
    }

    /** ^#派蒙nai清空队列$ */
    async paimon_nai_clearNaiQueue(e) {
        queue.clearNaiQueue();
        e.reply(`已清空队列，当前队列数为${queue.lock ? queue.size() + 1 : queue.size()}`)
        return true;
    }

    /** ^#派蒙nai设置鉴黄阈值$ */
    async paimon_nai_setTh(e) {
        let input_v = e.msg.replace(/^#派蒙nai设置鉴黄阈值/, '').trim()
        // input_v转为整数
        let input_num = parseFloat(input_v)
        if (isNaN(input_num)) {
            const data = readYaml(Config_yaml)
            if (!data) logger.error('无法读取config_yaml')
            e.reply('请输入正确的数字。当前阈值：'+  data.api4ai.nsfw_threshold)
            return true
        }
        await updateConfig('nsfw_threshold', input_num)
        e.reply('nsfw检查阈值变更为：' + input_num)
        return true;
    }
    
    /** ^#派蒙nai设置鉴黄开关$ */
    async paimon_nai_setThOn(e) {
        let input_v = e.msg.replace(/^#派蒙nai设置鉴黄开关/, '').trim()
        // input_v转为整数
        let input_num = parseInt(input_v)
        if (isNaN(input_num)) {
            const data = readYaml(Config_yaml)
            if (!data) logger.error('无法读取config_yaml')
            e.reply('请输入正确的数字。当前开关状态：'+  data['nsfw_check'])
            return true
        }
        await updateConfig('nsfw_check', input_num)
        if (input_num == 0){
          await updateConfig('nsfw_check', false)
          e.reply('鉴黄被关闭')
        }
        else{
          await updateConfig('nsfw_check', true)
          e.reply('鉴黄被打开')
        }
        return true;
    }
    /** ^#派蒙nai添加违禁词*/
    async paimon_nai_addUnsafeTag(e) {
        let input_v = e.msg.replace(/^#派蒙nai添加违禁词/, '').trim()
        let data = readYaml(Config_yaml)
        if (data.nai_unsafewords && input_v) {
            data.nai_unsafewords = `${data.nai_unsafewords}|${input_v}`
            writeYaml(Config_yaml, data)
            e.reply('添加成功 '+ data.nai_unsafewords)
        }
        else if(data.nai_unsafewords){
            e.reply('请输入违禁词。当前违禁词列表：' + data.nai_unsafewords)
        }
        else{
            e.reply('缺失违禁词文件')
        }
    }
    /** ^#派蒙nai设置使用接口 */
    async paimon_nai_set_use_token(e) {
        let input_v = e.msg.replace(/^#派蒙nai设置使用接口/, '').trim()
        // input_v转为整数
        let input_num = parseInt(input_v)
        if (isNaN(input_num)) {
            e.reply('请输入正确的数字')
            return true
        }
        await updateConfig('use_token', input_num)
        e.reply('已设置使用接口：' + input_num)
        return true
    }

    /** ^#派蒙nai绘画(开启|关闭)$ */
    async paimon_nai_turnOn(e) {
        const match = e.msg.trim().match(/^#派蒙nai绘画(开启|关闭)$/)
        if (!match) return e.reply('请输入：\n#派蒙nai绘画开启')
        if (match[1] === '开启') {
            await updateConfig('paimon_nai_turnOn', true)
            e.reply('已开启绘画')
        } else {
            await updateConfig('paimon_nai_turnOn', false)
            e.reply('已关闭绘画')
        }
        return
    }

    /** ^#派蒙nai设置CD */
    async paimon_nai_set_CD_all(e) {
        let input_v = e.msg.replace(/^#派蒙nai设置CD/, '').trim()
        // input_v转为整数
        let input_num = parseInt(input_v)
        if (isNaN(input_num)) {
            e.reply('请输入正确的数字')
            return true
        }
        await updateConfig('CD_all', input_num)
        e.reply('已设置派蒙nai画图全体CD：' + input_num)
        return true
    }

    /** ^#派蒙nai设置每日次数限制 */
    async paimon_nai_set_usageLimit_day(e) {
        let input_v = e.msg.replace(/^#派蒙nai设置每日次数限制/, '').trim()
        // input_v转为整数
        let input_num = parseInt(input_v)
        if (isNaN(input_num)) {
            e.reply('请输入正确的数字')
            return true
        }
        await updateConfig('usageLimit_day', input_num)
        e.reply('已设置派蒙nai画图每日次数限制为：' + input_num)
        return true
    }

    /** ^#派蒙nai(设置|删除)无限制人员(QQ|qq) */
    async paimon_nai_set_unlimited_users(e) {
        // 处理@at
        let qq_at = e.message.find(item => item.type == 'at')?.qq

        const match = e.msg.trim().match(/^#派蒙nai(设置|删除)无限制人员(QQ|qq)([\s\S]*)$/)
        if (match[3].trim() == '帮助') return e.reply('无限制人员可以不受CD和每日次数限制\n#派蒙nai设置/删除无限制人员qq[qqnum/@at]\n#派蒙nai查看无限制人员', false, { recallMsg: 115 })
        if (match) {
            if (!match[3]) {
                match[3] = qq_at
            } else {
                if (qq_at) return e.reply(`到底指的是${match[3]}还是${qq_at}？`, false, { recallMsg: 115 })
            }

            const qq_num = Number(match[3])
            if (Number.isInteger(qq_num)) {
                if (match[1] === "设置") {
                    if (e.user_id == qq_num) {
                        e.reply('主人不需要这个哦', false, { recallMsg: 115 })
                        return
                    }
                    else if (cfg.masterQQ.includes(qq_num)) {
                        e.reply('主人不需要这个哦', false, { recallMsg: 115 })
                        return
                    }
                    else if (cfg.qq == qq_num) {
                        e.reply('派蒙不需要这个哦', false, { recallMsg: 115 })
                        return
                    }
                    else {
                        let data = readYaml(Config_yaml)
                        if (data.nai_unlimited_users.includes(qq_num)) return e.reply('这个QQ早就在里面了>_<', false, { recallMsg: 115 })
                        data.nai_unlimited_users.push(qq_num)
                        writeYaml(Config_yaml, data)
                        e.reply('派蒙nai已新增无限制人员：' + qq_num)
                        return
                    }
                }
                else if (match[1] === "删除") {
                    let data = readYaml(Config_yaml)
                    if (data.nai_unlimited_users.includes(qq_num)) {
                        data.nai_unlimited_users.splice(data.nai_unlimited_users.indexOf(qq_num), 1)
                        writeYaml(Config_yaml, data)
                        e.reply('派蒙nai已删除无限制人员：' + qq_num)
                        return
                    }
                    else {
                        e.reply(`该QQ${qq_num}不在派蒙nai无限制人员名单中哦`, false, { recallMsg: 115 })
                        return
                    }
                }
            }
            else {
                e.reply(`你的输入为非数字：${match[3]},请输入正确的QQ号哦，或输入#派蒙nai设置无限制人员qq帮助`, false, { recallMsg: 115 })
                return
            }
        }
        else return e.reply('喵？请输入正确的QQ号哦；无限制人员可以不受CD和每日次数限制\n#派蒙nai设置无限制人员qq[帮助/qqnum/@at]\n#派蒙nai查看无限制人员', false, { recallMsg: 115 })
    }

    /** ^#派蒙nai增加(QQ|qq)?([0-9]*)次数([0-9]*)(次)? */
    async paimon_nai_add_usageLimit_today(e) {
        // 处理@at
        let qq_at = e.message.find(item => item.type == 'at')?.qq

        const match = e.msg.trim().match(/^#派蒙nai增加(QQ|qq)?([0-9]*)次数([0-9]*)(次)?/)
        if (match) {
            if (!match[2]) {
                match[2] = qq_at
            } else {
                if (qq_at) return e.reply(`到底是指${match[2]}还是${qq_at}？`, false, { recallMsg: 115 })
            }

            const qq_num = Number(match[2])
            const add_num = Number(match[3])
            if (Number.isInteger(qq_num) && Number.isInteger(add_num)) {
                checkUsageLimit_day(qq_num, add_num);
                e.reply(`已为${qq_num}增加${add_num}次今日使用nai次数`, false, { recallMsg: 115 })
                return
            }
            else {
                e.reply(`当前输入qq为${match[2]},次数为${match[3]},请输入正确的QQ号哦，例如#派蒙nai增加qq123456次数10次`, false, { recallMsg: 115 })
                return
            }
        }
        return e.reply('喵？请输入正确的QQ号哦，例如#派蒙nai增加qq123456次数10次', false, { recallMsg: 115 })
    }

    /** ^#派蒙nai查看无限制人员(QQ|qq)$ */
    async paimon_nai_unlimited_users_lists(e) {
        let data = readYaml(Config_yaml)
        if (data.nai_unlimited_users.length == 0) {
            e.reply('派蒙nai目前没有无限制人员哦', false, { recallMsg: 115 })
            return
        }
        else {
            let str = ''
            for (let i = 0; i < data.nai_unlimited_users.length; i++) {
                str += `${data.nai_unlimited_users[i]}\n`
            }
            e.reply(str)
            return
        }
    }

    /**^#解析(png|PNG)?$ */
    async getPngInfo(e) {
        e = await parseSourceImg(e)
        if (e.img) {
            // let pnginfo = new TextDecoder().decode(e.img[0])
            const imgResponse = await axios.get(e.img[0], {
                responseType: 'arraybuffer'
            });
            let imgSize = (imgResponse.headers.get('size') / 1024 / 1024).toFixed(2)
            if (imgSize > 1024 * 1024 * 50) {
                this.e.reply(`这图片超过50MB了，人家怕把自己干傻了，人家不干了！`)
                return false
            }
            let pnginfo = Buffer.from(imgResponse.data, 'binary')
                .toString('utf8');

            // 匹配nai3
            const match1 = pnginfo.match(/"prompt"(.*)"steps":/m);
            const match2 = pnginfo.match(/"uc"(.*)"request_type":/m);
            const match3 = pnginfo.match(/"sm"(.*)"sm_dyn":(.*?),/m);
            if (match1){
                let tags  = match1[0].replace(/"prompt": "|", "steps":|\\n/g, '').trim()
                let ntags = 'ntags=' + match2[0].replace(/"uc": "|", "request_type":|\\n/g, '').trim()
                let smea  = match3[0].replace(/"sm": |, "sm_dyn": (.*)|\\n/g, '').trim()
                let dyn   = match3[0].replace(/"sm": (.*?), "sm_dyn": |,|\\n/g, '').trim()
                let smea_dyn = 'smea: ' + smea + ', dyn: ' + dyn
                return e.reply(await common.makeForwardMsg(e, [tags, ntags, smea_dyn, await segment.image(imgResponse.data)], `PNG文件信息解析`))
            }
                
            // 匹配SD
            const match4 = pnginfo.match(/parameters.*/m);
            if (match4) {
                return e.reply(await common.makeForwardMsg(e, [await segment.image(imgResponse.data), match4[0].replace(/parameters|\u0000|\\n/g, '').trim(), e.img[0]], `PNG文件信息解析`))
            }
            return e.reply('该图片无信息，请确认是否为ai生成的原图且图片格式为png', false)
        } else {
            return e.reply('请将图片一起发送或引用图片', false)
        }
    }
    /**^#鉴赏(png|PNG)?$ */
    async getAppreciate(e) {

        e = await parseSourceImg(e)
        if (!e.img) return e.reply('请将图片连同指令一起发送')
        console.log(e.img[0]);	
        let base64 = await url2Base64(e.img[0])
        try {
            e.reply('少女使用标签器鉴赏中~（*/∇＼*）', false, { recallMsg: 115 })
            let res = await fetch("https://lunatic22-deepdanbooru-string.hf.space/api/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    data: [
                        "data:image/png;base64," + base64,
                        0.3,
                    ]
                })
            })
            res = await res.json()
            let tags = res.data[1];
            console.log(tags);
            console.log('解析成功')
            const match_rating =tags.match(/rating.*?,/g);
            return e.reply(await common.makeForwardMsg(e, [tags.replace(/rating:.*?,/g, '').trim(),match_rating, e.img[0]], `DeepDanbooru反推结果`))
        } catch (err) {
            console.log(err)
            console.log('解析失败')
            return e.reply('DeepDanbooru少女解析失败', false, { recallMsg: 115 })
        }
        
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

async function url2Base64(url) {
    let base64 = await axios.get(url, {
        responseType: 'arraybuffer'
    }).then(res => {
        return Buffer.from(res.data, 'binary').toString('base64')
    }).catch(err => {
        console.log(err)
    })
    return base64
}