let users = {
    user: []
}
export const UserData = new Proxy(users, {
    set(target, property, value) {
        target[property] = value
        return true
    }
})
// 获取用户信息
export function UserInfo(token) {
    const userData = users.user.find(user => user.token.includes(token))
    if (userData) {
        return {
            user: userData.user,
            autho: userData.autho,
            label: userData.label
        }
    } else {
        return undefined
    }
}
// 获取用户数据
export function GetUser(user) {
    return users.user.find(user => user === user)
}
// 添加用户token
export async function AddUser(data) {
    const userIndex = users.user.findIndex(user => user === data.user)
    if (userIndex >= 0) {
        users.user[userIndex].token.push(data.token)
    } else {
        users.user.push({
            user: data.user,
            autho: data.autho,
            token: [data.token],
            label: data.label || '',
            tiem: new Date()
        })
    }
    await redis.set('CHATGPT:SERVER_USER', JSON.stringify(users))
}
export async function ReplaceUsers() {
    users = JSON.parse(await redis.get('CHATGPT:SERVER_USER') || '{"user": []}')
}