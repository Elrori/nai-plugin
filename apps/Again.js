import plugin from '../../../lib/plugins/plugin.js'
import { txt2img } from './Txt2img.js'
import { img2img } from './Img2img.js'
import {
  readYaml,
  Config_yaml
} from '../utils/paimonNaiControl.js'

export class again extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'nai-重新绘制',
            /** 功能描述 */
            dsc: '重新绘制图片',
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 1009,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: '^(/|#|r)(重画|e)([0-9]*)(张|幅|次|)$',
                    /** 执行方法 */
                    fnc: 'again'
                }
            ]
        })
    }

    async again(e) {
    
        // re feature-----------------------------------------
        let match = e.msg.trim().match(/^(#重画|\/重画|re)([0-9]*)(张|幅|次|)/)
        if (match){
            let input_num = parseInt(match[2])
            if (input_num && input_num <= 3 && input_num > 0) {
                e.renums = input_num
            }
            else {
                e.renums = 1
                if (input_num)
                  e.reply("一次最多重画3张~");
            }
        }
        else {
            logger.error('重画匹配异常')
            return true
        }
        // paimon_nai_turnOn
        let config_yaml = readYaml(Config_yaml)
        if (!config_yaml) logger.error('无法读取config_yaml')
        if (!config_yaml.paimon_nai_turnOn) return
        // re feature end-------------------------------------
        
        const usageData = await redis.get(`nai:again:${e.user_id}`);
        if (!usageData) {
            e.reply("太久远了，我也忘记上一次绘的图是什么了");
            return false;
        }
    
        const { msg, img, type } = JSON.parse(usageData);
        if (msg) e.msg = msg;
        if (img) e.img = img;
    
        if (type === 'txt2img') {
            const againTxt2img = new txt2img();
            await againTxt2img.txt2img(e);
        } else {
            const againImg2img = new img2img();
            await againImg2img.img2img(e);
        }
        return true;
    }
}
