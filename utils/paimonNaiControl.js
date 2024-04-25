import moment from "moment";
import yaml from 'yaml'
import fs from 'fs'
import path from 'path'

const Path = process.cwd();
const Plugin_Name = 'nai-plugin'
const Plugin_Path = path.join(Path, 'plugins', Plugin_Name)
export const Config_yaml = `${Plugin_Path}/config/config/config.yaml`

/**查看或增加指定用户当日使用限制  
* @param qq 用户qq号
* @param num 数据库中用户使用记录要增加的次数
*/
export async function checkUsageLimit_day(qq, num) {
    // 该用户的当日可用次数
    let usageLimit_day = await redis.get(`Yz:PaimongNai:usageLimit_day:${qq}`);
    if (usageLimit_day && !num) {
        return usageLimit_day;
    }
    else {
        // 读取当日次数限制yaml
        let config_yaml = readYaml(Config_yaml)
        // 当前时间
        let time = moment(Date.now()).add(1, "days").format("YYYY-MM-DD 00:00:00");
        // 到明日零点的剩余秒数
        let exTime = Math.round(
            (new Date(time).getTime() - new Date().getTime()) / 1000
        );
        if (!usageLimit_day) {
            await redis.set(`Yz:PaimongNai:usageLimit_day:${qq}`, config_yaml.usageLimit_day * 1 + num, { EX: exTime });
        } else {
            await redis.set(`Yz:PaimongNai:usageLimit_day:${qq}`, usageLimit_day * 1 + num, { EX: exTime });
        }
        return await redis.get(`Yz:PaimongNai:usageLimit_day:${qq}`);
    }
}

/**指定用户使用次数加num次  
 * @param qq 用户qq号
 * @param num 数据库中用户使用记录要增加的次数
 */
export async function addUsage(qq, num) {
    // logger.info(num);
    // 该用户的使用次数
    let usageData = await redis.get(`Yz:PaimongNai:Usage:${qq}`);
    // 当前时间
    let time = moment(Date.now()).add(1, "days").format("YYYY-MM-DD 00:00:00");
    // 到明日零点的剩余秒数
    let exTime = Math.round(
        (new Date(time).getTime() - new Date().getTime()) / 1000
    );
    if (!usageData) {
        await redis.set(`Yz:PaimongNai:Usage:${qq}`, num * 1, { EX: exTime });
    } else {
        await redis.set(`Yz:PaimongNai:Usage:${qq}`, usageData * 1 + num, { EX: exTime });
    }
    return true;
}

/**
 * 清除指定用户的cd
 * @return {*} 
 */
export async function clearCD(e) {
    await redis.del(`Yz:PaimongNai`);
    await redis.del(`Yz:PaimongNai:${e.group_id}`);
    await redis.del(`Yz:PaimongNai:${e.group_id}:${e.user_id}`);
    await redis.del(`Yz:PaimongNai:multiPic:${e.user_id}`);
    return true;
}

/** 读取YAML文件 */
export function readYaml(filePath) {
    return yaml.parse(fs.readFileSync(filePath, 'utf8'))
}

/** 写入YAML文件 */
export function writeYaml(filePath, data) {
    fs.writeFileSync(filePath, yaml.stringify(data), 'utf8')
}

/** 更新YAML文件 */
export async function updateConfig(key, value) {
    const data = readYaml(Config_yaml)
    if (!data) logger.error('无法读取config_yaml')
    data[key] = value
    writeYaml(Config_yaml, data)
    return data
}