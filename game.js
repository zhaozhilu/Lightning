const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 游戏状态
let gameState = 'menu'; // menu, playing, paused, gameOver
let score = 0;
let lives = 10;
let coins = 5; // 初始币数
let bulletType = 1; // 1: 普通, 2: 双发, 3: 激光, 4: S型
let level = 1; // 当前关卡
let bossSpawned = false; // Boss是否已生成
let lastBossScore = 0; // 上次生成Boss时的分数

// 玩家飞机
const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 50,
    height: 50,
    speed: 5,
    color: '#00ffff',
    shootCooldown: 0,
    shootInterval: 5, // 射击间隔（帧数）
    invulnerable: 0, // 受伤后的无敌时间
    hurtFlash: 0 // 受伤闪烁效果
};

// 子弹数组
let bullets = []; // 玩家子弹
let enemyBullets = []; // 敌方子弹
let enemies = [];
let boss = null; // Boss对象
let particles = [];
let explosions = []; // 爆炸效果数组
let stars = [];

// 键盘状态
const keys = {};

// 初始化星星背景
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 0.5 + 0.2
        });
    }
}

// 绘制玩家飞机（仿真型）
function drawPlayer() {
    ctx.save();
    
    // 受伤闪烁效果
    if (player.hurtFlash > 0) {
        ctx.globalAlpha = 0.5 + Math.sin(player.hurtFlash * 0.5) * 0.5;
        player.hurtFlash--;
    }
    
    // 无敌时间闪烁效果
    if (player.invulnerable > 0) {
        ctx.globalAlpha = 0.5 + Math.sin(player.invulnerable * 0.3) * 0.5;
        player.invulnerable--;
    }
    
    ctx.translate(player.x, player.y);
    
    // 受伤时绘制红色边框
    if (player.hurtFlash > 0 || player.invulnerable > 0) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // 机身阴影
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
    
    // 机身主体（流线型）
    const bodyGradient = ctx.createLinearGradient(0, -30, 0, 30);
    bodyGradient.addColorStop(0, '#1a8cff');
    bodyGradient.addColorStop(0.3, '#00ccff');
    bodyGradient.addColorStop(0.7, '#0099cc');
    bodyGradient.addColorStop(1, '#006699');
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    // 机头
    ctx.moveTo(0, -30);
    ctx.lineTo(-8, -20);
    // 机身左侧
    ctx.lineTo(-12, 0);
    ctx.lineTo(-10, 20);
    ctx.lineTo(-6, 28);
    // 机尾
    ctx.lineTo(0, 30);
    // 机身右侧
    ctx.lineTo(6, 28);
    ctx.lineTo(10, 20);
    ctx.lineTo(12, 0);
    ctx.lineTo(8, -20);
    ctx.closePath();
    ctx.fill();
    
    // 机翼（主翼）
    ctx.fillStyle = '#0066cc';
    ctx.beginPath();
    // 左主翼
    ctx.moveTo(-8, 5);
    ctx.lineTo(-25, 8);
    ctx.lineTo(-22, 15);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    // 右主翼
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.lineTo(25, 8);
    ctx.lineTo(22, 15);
    ctx.lineTo(10, 12);
    ctx.closePath();
    ctx.fill();
    
    // 尾翼（垂直尾翼）
    ctx.fillStyle = '#004499';
    ctx.beginPath();
    ctx.moveTo(0, 25);
    ctx.lineTo(-3, 30);
    ctx.lineTo(0, 28);
    ctx.lineTo(3, 30);
    ctx.closePath();
    ctx.fill();
    
    // 水平尾翼
    ctx.beginPath();
    // 左水平尾翼
    ctx.moveTo(-6, 20);
    ctx.lineTo(-15, 22);
    ctx.lineTo(-12, 25);
    ctx.lineTo(-6, 23);
    ctx.closePath();
    ctx.fill();
    // 右水平尾翼
    ctx.beginPath();
    ctx.moveTo(6, 20);
    ctx.lineTo(15, 22);
    ctx.lineTo(12, 25);
    ctx.lineTo(6, 23);
    ctx.closePath();
    ctx.fill();
    
    // 座舱（驾驶舱）
    ctx.fillStyle = '#66ccff';
    ctx.beginPath();
    ctx.ellipse(0, -15, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 座舱高光
    ctx.fillStyle = '#b3e6ff';
    ctx.beginPath();
    ctx.ellipse(0, -15, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 机头细节
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -25, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 引擎喷口和火焰效果
    const engineGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
    engineGradient.addColorStop(0, '#ffff00');
    engineGradient.addColorStop(0.5, '#ff6600');
    engineGradient.addColorStop(1, '#ff0000');
    
    ctx.fillStyle = engineGradient;
    // 左引擎
    ctx.beginPath();
    ctx.ellipse(-10, 30, 4, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // 右引擎
    ctx.beginPath();
    ctx.ellipse(10, 30, 4, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 引擎内部
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(-10, 30, 2, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(10, 30, 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 机翼边缘高光
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-25, 8);
    ctx.lineTo(-22, 15);
    ctx.moveTo(25, 8);
    ctx.lineTo(22, 15);
    ctx.stroke();
    
    ctx.restore();
}

// 子弹类
class Bullet {
    constructor(x, y, type) {
        this.startX = x;
        this.x = x;
        this.y = y;
        this.type = type;
        this.speed = 8;
        this.width = 4;
        this.height = 10;
        this.damage = 1;
        this.time = 0; // 用于S型轨迹
        
        if (type === 2) { // 双发子弹
            this.width = 6;
            this.damage = 1.5;
        } else if (type === 3) { // 激光子弹
            this.width = 8;
            this.height = 20;
            this.speed = 12;
            this.damage = 2;
        } else if (type === 4) { // S型子弹
            this.width = 5;
            this.height = 12;
            this.speed = 7;
            this.damage = 1.8;
            this.amplitude = 30; // S型摆动幅度
            this.frequency = 0.1; // S型摆动频率
        }
    }
    
    update() {
        this.y -= this.speed;
        this.time++;
        
        if (this.type === 4) { // S型子弹轨迹
            // 使用正弦函数创建S形路径
            this.x = this.startX + Math.sin(this.time * this.frequency) * this.amplitude;
        }
    }
    
    draw() {
        ctx.save();
        
        if (this.type === 1) { // 普通子弹
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
        } else if (this.type === 2) { // 双发子弹
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
            // 添加光效
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff00';
            ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
        } else if (this.type === 3) { // 激光子弹
            ctx.fillStyle = '#ff00ff';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff00ff';
            ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
        } else if (this.type === 4) { // S型子弹
            // S型子弹带轨迹效果
            ctx.strokeStyle = '#ff6600';
            ctx.fillStyle = '#ff6600';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff6600';
            
            // 绘制子弹主体
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制S型轨迹尾迹
            if (this.time > 5) {
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                const trailLength = Math.min(20, this.time);
                for (let i = 1; i < trailLength; i++) {
                    const trailY = this.y + i * this.speed;
                    const trailX = this.startX + Math.sin((this.time - i) * this.frequency) * this.amplitude;
                    ctx.lineTo(trailX, trailY);
                }
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
        
        ctx.restore();
    }
}

// 敌方子弹类
class EnemyBullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 10;
        this.speed = 4;
        this.vx = 0; // 水平速度
        this.vy = this.speed; // 垂直速度
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
    
    draw() {
        ctx.save();
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0000';
        ctx.fillRect(this.x - this.width/2, this.y, this.width, this.height);
        ctx.restore();
    }
}

// 敌人类（仿真型敌方飞机）
class Enemy {
    constructor() {
        this.x = Math.random() * (canvas.width - 40) + 20;
        this.y = -30;
        this.width = 40;
        this.height = 40;
        this.speed = Math.random() * 2 + 1;
        this.health = 1;
        this.shootCooldown = 0;
        this.shootInterval = Math.random() * 60 + 60; // 随机射击间隔
        this.color = `hsl(${Math.random() * 60 + 0}, 100%, 50%)`;
    }
    
    update() {
        this.y += this.speed;
        this.shootCooldown++;
        
        // 敌方飞机射击逻辑
        if (this.shootCooldown >= this.shootInterval && this.y > 50 && this.y < canvas.height - 100) {
            this.shoot();
            this.shootCooldown = 0;
            this.shootInterval = Math.random() * 60 + 60; // 重置射击间隔
        }
    }
    
    shoot() {
        // 敌方飞机发射子弹
        enemyBullets.push(new EnemyBullet(this.x, this.y + 20));
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 机身阴影
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
        
        // 机身主体（流线型，红色系）
        const bodyGradient = ctx.createLinearGradient(0, 30, 0, -30);
        bodyGradient.addColorStop(0, '#cc0000');
        bodyGradient.addColorStop(0.3, '#ff3333');
        bodyGradient.addColorStop(0.7, '#cc0000');
        bodyGradient.addColorStop(1, '#990000');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        // 机头（向下）
        ctx.moveTo(0, 30);
        ctx.lineTo(-8, 20);
        // 机身左侧
        ctx.lineTo(-12, 0);
        ctx.lineTo(-10, -20);
        ctx.lineTo(-6, -28);
        // 机尾
        ctx.lineTo(0, -30);
        // 机身右侧
        ctx.lineTo(6, -28);
        ctx.lineTo(10, -20);
        ctx.lineTo(12, 0);
        ctx.lineTo(8, 20);
        ctx.closePath();
        ctx.fill();
        
        // 机翼（主翼）
        ctx.fillStyle = '#990000';
        ctx.beginPath();
        // 左主翼
        ctx.moveTo(-8, -5);
        ctx.lineTo(-25, -8);
        ctx.lineTo(-22, -15);
        ctx.lineTo(-10, -12);
        ctx.closePath();
        ctx.fill();
        // 右主翼
        ctx.beginPath();
        ctx.moveTo(8, -5);
        ctx.lineTo(25, -8);
        ctx.lineTo(22, -15);
        ctx.lineTo(10, -12);
        ctx.closePath();
        ctx.fill();
        
        // 尾翼（垂直尾翼）
        ctx.fillStyle = '#660000';
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(-3, -30);
        ctx.lineTo(0, -28);
        ctx.lineTo(3, -30);
        ctx.closePath();
        ctx.fill();
        
        // 水平尾翼
        ctx.beginPath();
        // 左水平尾翼
        ctx.moveTo(-6, -20);
        ctx.lineTo(-15, -22);
        ctx.lineTo(-12, -25);
        ctx.lineTo(-6, -23);
        ctx.closePath();
        ctx.fill();
        // 右水平尾翼
        ctx.beginPath();
        ctx.moveTo(6, -20);
        ctx.lineTo(15, -22);
        ctx.lineTo(12, -25);
        ctx.lineTo(6, -23);
        ctx.closePath();
        ctx.fill();
        
        // 座舱（驾驶舱）
        ctx.fillStyle = '#ff6666';
        ctx.beginPath();
        ctx.ellipse(0, 15, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // 座舱高光
        ctx.fillStyle = '#ff9999';
        ctx.beginPath();
        ctx.ellipse(0, 15, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 机头细节
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 25, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 引擎喷口和火焰效果
        const engineGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
        engineGradient.addColorStop(0, '#ffaa00');
        engineGradient.addColorStop(0.5, '#ff6600');
        engineGradient.addColorStop(1, '#ff0000');
        
        ctx.fillStyle = engineGradient;
        // 左引擎
        ctx.beginPath();
        ctx.ellipse(-10, -30, 4, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // 右引擎
        ctx.beginPath();
        ctx.ellipse(10, -30, 4, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 引擎内部
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(-10, -30, 2, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(10, -30, 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 机翼边缘高光
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-25, -8);
        ctx.lineTo(-22, -15);
        ctx.moveTo(25, -8);
        ctx.lineTo(22, -15);
        ctx.stroke();
        
        ctx.restore();
    }
}

// Boss类
class Boss {
    constructor(level) {
        this.level = level;
        this.x = canvas.width / 2;
        this.y = 80;
        this.width = 80 + level * 10; // 随关卡增大
        this.height = 80 + level * 10;
        this.maxHealth = 300 * level;
        this.health = this.maxHealth;
        this.speed = 1 + level * 0.2;
        this.direction = 1; // 移动方向
        this.shootCooldown = 0;
        this.shootInterval = 30 - level * 2; // 随关卡射击更快
        if (this.shootInterval < 10) this.shootInterval = 10;
    }
    
    update() {
        // Boss左右移动
        this.x += this.speed * this.direction;
        if (this.x <= this.width/2 || this.x >= canvas.width - this.width/2) {
            this.direction *= -1;
        }
        
        // Boss射击
        this.shootCooldown++;
        if (this.shootCooldown >= this.shootInterval) {
            this.shoot();
            this.shootCooldown = 0;
        }
    }
    
    shoot() {
        // Boss多方向射击
        const bulletCount = 3 + Math.floor(this.level / 2); // 随关卡增加子弹数
        const spreadAngle = Math.PI / 3; // 60度扇形
        const angleStep = spreadAngle / (bulletCount + 1);
        const startAngle = Math.PI / 2 - spreadAngle / 2; // 从中心向下偏左开始
        
        for (let i = 1; i <= bulletCount; i++) {
            const angle = startAngle + angleStep * i;
            const bullet = new EnemyBullet(this.x, this.y + this.height/2);
            bullet.vx = Math.cos(angle) * 3;
            bullet.vy = Math.sin(angle) * 3;
            bullet.speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
            enemyBullets.push(bullet);
        }
        
        // 中心直射
        enemyBullets.push(new EnemyBullet(this.x, this.y + this.height/2));
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const scale = 1 + this.level * 0.1;
        ctx.scale(scale, scale);
        
        // Boss阴影（更强烈）
        ctx.shadowBlur = 15 + this.level * 2;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        
        // 根据关卡绘制不同坚固度的造型
        this.drawBossBody();
        
        ctx.restore();
    }
    
    drawBossBody() {
        // 基础机身（更大更坚固）
        const bodyGradient = ctx.createLinearGradient(0, 40, 0, -40);
        const darkRed = `rgb(${100 + this.level * 10}, 0, 0)`;
        const midRed = `rgb(${150 + this.level * 10}, ${30 + this.level * 5}, 0)`;
        const lightRed = `rgb(${200 + this.level * 5}, ${50 + this.level * 5}, 0)`;
        
        bodyGradient.addColorStop(0, darkRed);
        bodyGradient.addColorStop(0.3, midRed);
        bodyGradient.addColorStop(0.7, midRed);
        bodyGradient.addColorStop(1, darkRed);
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(-15, 25);
        ctx.lineTo(-20, 0);
        ctx.lineTo(-18, -25);
        ctx.lineTo(-12, -35);
        ctx.lineTo(0, -40);
        ctx.lineTo(12, -35);
        ctx.lineTo(18, -25);
        ctx.lineTo(20, 0);
        ctx.lineTo(15, 25);
        ctx.closePath();
        ctx.fill();
        
        // 装甲层（随关卡增加）
        for (let i = 0; i < this.level; i++) {
            ctx.strokeStyle = `rgba(255, ${200 - i * 20}, 0, 0.8)`;
            ctx.lineWidth = 2 + i;
            ctx.stroke();
        }
        
        // 大型机翼
        ctx.fillStyle = `rgb(${80 + this.level * 10}, 0, 0)`;
        // 左主翼
        ctx.beginPath();
        ctx.moveTo(-15, -5);
        ctx.lineTo(-40 - this.level * 3, -8);
        ctx.lineTo(-35 - this.level * 3, -20);
        ctx.lineTo(-18, -15);
        ctx.closePath();
        ctx.fill();
        // 右主翼
        ctx.beginPath();
        ctx.moveTo(15, -5);
        ctx.lineTo(40 + this.level * 3, -8);
        ctx.lineTo(35 + this.level * 3, -20);
        ctx.lineTo(18, -15);
        ctx.closePath();
        ctx.fill();
        
        // 额外装甲板（关卡越高越多）
        if (this.level >= 3) {
            ctx.fillStyle = `rgba(255, ${150 - this.level * 10}, 0, 0.6)`;
            // 左装甲
            ctx.fillRect(-25, -10, 8, 15);
            // 右装甲
            ctx.fillRect(17, -10, 8, 15);
        }
        
        if (this.level >= 5) {
            // 更多装甲
            ctx.fillRect(-30, 5, 10, 12);
            ctx.fillRect(20, 5, 10, 12);
        }
        
        if (this.level >= 7) {
            // 重型装甲
            ctx.fillRect(-35, -5, 12, 20);
            ctx.fillRect(23, -5, 12, 20);
        }
        
        // 大型座舱
        ctx.fillStyle = '#ff6666';
        ctx.beginPath();
        ctx.ellipse(0, 20, 10 + this.level, 12 + this.level, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 多个引擎（随关卡增加）
        const engineGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
        engineGradient.addColorStop(0, '#ffaa00');
        engineGradient.addColorStop(0.5, '#ff6600');
        engineGradient.addColorStop(1, '#ff0000');
        
        ctx.fillStyle = engineGradient;
        const engineCount = 2 + Math.floor(this.level / 3);
        const engineSpacing = 20;
        
        for (let i = 0; i < engineCount; i++) {
            const offset = (i - (engineCount - 1) / 2) * engineSpacing;
            ctx.beginPath();
            ctx.ellipse(offset, -40, 5 + this.level, 15 + this.level, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 引擎内部
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(offset, -40, 3, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = engineGradient;
        }
        
        // 武器系统（随关卡增加）
        ctx.fillStyle = '#ffff00';
        for (let i = 0; i < this.level; i++) {
            const angle = (Math.PI * 2 / this.level) * i;
            const wx = Math.cos(angle) * 30;
            const wy = Math.sin(angle) * 15;
            ctx.beginPath();
            ctx.arc(wx, wy, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 血量显示（红色闪烁）
        if (this.health < this.maxHealth * 0.3) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.5;
        }
    }
    
    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            explosions.push(new Explosion(this.x, this.y, 'large'));
            score += 100 * this.level; // Boss奖励分数
            boss = null;
            bossSpawned = false;
            level++;
            if (level > 10) level = 10; // 最多10级
            document.getElementById('bossPanel').style.display = 'none';
        }
    }
}

// 粒子效果
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 30;
        this.color = color;
        this.size = Math.random() * 3 + 2;
    }
}

// 限制粒子数量，防止性能问题
const MAX_PARTICLES = 200;
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }
    
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / 30;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 爆炸效果类
class Explosion {
    constructor(x, y, size = 'normal') {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.life = 60;
        this.maxLife = 60;
        this.size = size; // 'normal' 或 'large'
        
        // 创建大量爆炸粒子
        const particleCount = size === 'large' ? 50 : 30;
        const colors = ['#ff0000', '#ff6600', '#ffff00', '#ffffff', '#ffaa00'];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            const speed = Math.random() * 8 + 4;
            const particle = {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: this.maxLife,
                maxLife: this.maxLife,
                size: Math.random() * 4 + 2,
                color: colors[Math.floor(Math.random() * colors.length)]
            };
            this.particles.push(particle);
        }
    }
    
    update() {
        this.life--;
        for (let particle of this.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98; // 减速
            particle.vy *= 0.98;
            particle.life--;
        }
    }
    
    draw() {
        ctx.save();
        
        // 绘制爆炸中心光球
        const alpha = this.life / this.maxLife;
        const radius = (1 - alpha) * 40;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
        gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制爆炸粒子
        for (let particle of this.particles) {
            const particleAlpha = particle.life / particle.maxLife;
            ctx.globalAlpha = particleAlpha;
            ctx.fillStyle = particle.color;
            ctx.shadowBlur = 5;
            ctx.shadowColor = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    isDead() {
        return this.life <= 0;
    }
}

// 发射子弹
function shoot() {
    if (bulletType === 1) { // 普通子弹
        bullets.push(new Bullet(player.x, player.y - 30, 1));
    } else if (bulletType === 2) { // 双发子弹
        bullets.push(new Bullet(player.x - 15, player.y - 30, 2));
        bullets.push(new Bullet(player.x + 15, player.y - 30, 2));
    } else if (bulletType === 3) { // 激光子弹
        bullets.push(new Bullet(player.x, player.y - 30, 3));
    } else if (bulletType === 4) { // S型子弹
        bullets.push(new Bullet(player.x, player.y - 30, 4));
    }
}

// 更新玩家位置
function updatePlayer() {
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        player.x = Math.max(player.width/2, player.x - player.speed);
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        player.x = Math.min(canvas.width - player.width/2, player.x + player.speed);
    }
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        player.y = Math.max(player.height/2, player.y - player.speed);
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        player.y = Math.min(canvas.height - player.height/2, player.y + player.speed);
    }
    
    // 持续射击逻辑
    if (keys[' '] && gameState === 'playing') {
        player.shootCooldown++;
        if (player.shootCooldown >= player.shootInterval) {
            shoot();
            player.shootCooldown = 0;
        }
    } else {
        player.shootCooldown = 0;
    }
}

// 碰撞检测
function checkCollisions() {
    // 玩家子弹与敌方子弹碰撞（相互抵消）
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let j = enemyBullets.length - 1; j >= 0; j--) {
            const enemyBullet = enemyBullets[j];
            
            const dx = bullet.x - enemyBullet.x;
            const dy = bullet.y - enemyBullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (bullet.width/2 + enemyBullet.width/2)) {
                // 创建碰撞粒子（限制数量）
                if (particles.length < MAX_PARTICLES) {
                    for (let k = 0; k < 8; k++) {
                        particles.push(new Particle(bullet.x, bullet.y, '#ffff00'));
                    }
                }
                
                bullets.splice(i, 1);
                enemyBullets.splice(j, 1);
                break;
            }
        }
    }
    
    // 玩家子弹与Boss碰撞
    if (boss) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            
            const dx = bullet.x - boss.x;
            const dy = bullet.y - boss.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (boss.width/2 + bullet.width/2)) {
                boss.takeDamage(bullet.damage);
                bullets.splice(i, 1);
                
                // 创建击中粒子（限制数量）
                if (particles.length < MAX_PARTICLES) {
                    for (let k = 0; k < 5; k++) {
                        particles.push(new Particle(bullet.x, bullet.y, '#ffff00'));
                    }
                }
            }
        }
    }
    
    // 玩家子弹与敌人碰撞
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            if (bullet.x < enemy.x + enemy.width/2 &&
                bullet.x > enemy.x - enemy.width/2 &&
                bullet.y < enemy.y + enemy.height/2 &&
                bullet.y > enemy.y - enemy.height/2) {
                
                // 创建爆炸粒子（限制数量）
                if (particles.length < MAX_PARTICLES) {
                    const addCount = Math.min(10, MAX_PARTICLES - particles.length);
                    for (let k = 0; k < addCount; k++) {
                        particles.push(new Particle(enemy.x, enemy.y, enemy.color));
                    }
                }
                
                enemy.health -= bullet.damage;
                bullets.splice(i, 1);
                
                if (enemy.health <= 0) {
                    // 创建大型爆炸效果
                    explosions.push(new Explosion(enemy.x, enemy.y, 'large'));
                    score += 10;
                    enemies.splice(j, 1);
                }
                break;
            }
        }
    }
    
    // 玩家与敌人碰撞
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (player.width/2 + enemy.width/2) && player.invulnerable <= 0) {
            // 创建爆炸效果
            explosions.push(new Explosion(enemy.x, enemy.y, 'normal'));
            
            // 玩家受伤效果
            lives--;
            player.invulnerable = 120; // 2秒无敌时间（60fps）
            player.hurtFlash = 30; // 0.5秒闪烁效果
            
            enemies.splice(i, 1);
            
            if (lives <= 0) {
                gameState = 'gameOver';
                document.getElementById('gameOver').style.display = 'block';
                // 显示投币按钮（如果有币）
                if (coins > 0) {
                    document.getElementById('coinBtn').style.display = 'inline-block';
                    document.getElementById('coinBtn').disabled = false;
                } else {
                    document.getElementById('coinBtn').style.display = 'none';
                }
            }
        }
    }
    
    // 玩家与Boss碰撞
    if (boss && player.invulnerable <= 0) {
        const dx = player.x - boss.x;
        const dy = player.y - boss.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (player.width/2 + boss.width/2)) {
            // 创建爆炸效果
            explosions.push(new Explosion(boss.x, boss.y, 'normal'));
            
            // 玩家受伤效果
            lives--;
            player.invulnerable = 120;
            player.hurtFlash = 30;
            
            if (lives <= 0) {
                gameState = 'gameOver';
                document.getElementById('gameOver').style.display = 'block';
                // 显示投币按钮（如果有币）
                if (coins > 0) {
                    document.getElementById('coinBtn').style.display = 'inline-block';
                    document.getElementById('coinBtn').disabled = false;
                } else {
                    document.getElementById('coinBtn').style.display = 'none';
                }
            }
        }
    }
    
    // 敌方子弹与玩家碰撞
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const enemyBullet = enemyBullets[i];
        
        const dx = player.x - enemyBullet.x;
        const dy = player.y - enemyBullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (player.width/2 + enemyBullet.width/2) && player.invulnerable <= 0) {
            // 创建小型爆炸效果
            explosions.push(new Explosion(enemyBullet.x, enemyBullet.y, 'normal'));
            
            // 玩家受伤效果
            lives--;
            player.invulnerable = 120; // 2秒无敌时间（60fps）
            player.hurtFlash = 30; // 0.5秒闪烁效果
            
            enemyBullets.splice(i, 1);
            
            if (lives <= 0) {
                gameState = 'gameOver';
                document.getElementById('gameOver').style.display = 'block';
                // 显示投币按钮（如果有币）
                if (coins > 0) {
                    document.getElementById('coinBtn').style.display = 'inline-block';
                    document.getElementById('coinBtn').disabled = false;
                } else {
                    document.getElementById('coinBtn').style.display = 'none';
                }
            }
        }
    }
}

// 绘制星星背景
function drawStars() {
    ctx.fillStyle = '#ffffff';
    for (let star of stars) {
        ctx.globalAlpha = Math.random();
        ctx.fillRect(star.x, star.y, star.size, star.size);
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    }
    ctx.globalAlpha = 1;
}

// 游戏主循环
function gameLoop() {
    try {
        // 清空画布
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (gameState === 'playing') {
        // 绘制星星
        drawStars();
        
        // 更新玩家
        updatePlayer();
        drawPlayer();
        
        // 更新和绘制子弹（限制数量防止性能问题）
        const MAX_BULLETS = 200;
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (i < bullets.length) { // 安全检查
                bullets[i].update();
                bullets[i].draw();
                
                // 检查子弹是否超出屏幕边界
                if (bullets[i].y < 0) {
                    bullets.splice(i, 1);
                } else if (bullets[i].type === 4) {
                    // S型子弹还需要检查左右边界
                    if (bullets[i].x < 0 || bullets[i].x > canvas.width) {
                        bullets.splice(i, 1);
                    }
                }
            }
        }
        
        // 如果子弹过多，清理最旧的
        if (bullets.length > MAX_BULLETS) {
            bullets.splice(0, bullets.length - MAX_BULLETS);
        }
        
        // Boss生成逻辑（每300分生成一个Boss，最多10级）
        if (level <= 10 && !bossSpawned && score >= lastBossScore + 300) {
            boss = new Boss(level);
            bossSpawned = true;
            lastBossScore = score;
            document.getElementById('bossPanel').style.display = 'flex';
        }
        
        // 更新和绘制Boss
        if (boss) {
            boss.update();
            boss.draw();
            
            // 更新Boss血量显示
            const currentHealth = Math.max(0, Math.floor(boss.health));
            const maxHealth = boss.maxHealth;
            const healthPercent = (currentHealth / maxHealth) * 100;
            
            document.getElementById('bossHealth').textContent = currentHealth;
            document.getElementById('bossMaxHealth').textContent = maxHealth;
            
            // 更新Boss血量进度条
            document.getElementById('bossHealthBar').style.display = 'block';
            document.getElementById('bossHealthBarFill').style.width = healthPercent + '%';
            document.getElementById('bossHealthBarText').textContent = currentHealth + ' / ' + maxHealth;
            
            // 根据血量改变颜色
            if (healthPercent > 60) {
                document.getElementById('bossHealthBarFill').style.background = 'linear-gradient(90deg, #ff0000 0%, #ff6600 50%, #ffaa00 100%)';
            } else if (healthPercent > 30) {
                document.getElementById('bossHealthBarFill').style.background = 'linear-gradient(90deg, #ff6600 0%, #ffaa00 50%, #ffff00 100%)';
            } else {
                document.getElementById('bossHealthBarFill').style.background = 'linear-gradient(90deg, #ffaa00 0%, #ffff00 50%, #ffffff 100%)';
            }
            
            // Boss被击败后，清理并准备下一级
            if (boss.health <= 0) {
                boss = null;
                bossSpawned = false;
                document.getElementById('bossHealthBar').style.display = 'none';
            }
        } else {
            document.getElementById('bossPanel').style.display = 'none';
            document.getElementById('bossHealthBar').style.display = 'none';
        }
        
        // 生成敌人（Boss存在时不生成普通敌人，限制敌人数量防止性能问题）
        if (!boss && enemies.length < 20 && Math.random() < 0.02) {
            enemies.push(new Enemy());
        }
        
        // 更新和绘制敌人
        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update();
            enemies[i].draw();
            
            if (enemies[i].y > canvas.height) {
                enemies.splice(i, 1);
            }
        }
        
        // 更新和绘制敌方子弹（限制数量防止性能问题）
        const MAX_ENEMY_BULLETS = 150;
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            if (i < enemyBullets.length) { // 安全检查
                enemyBullets[i].update();
                enemyBullets[i].draw();
                
                // 检查子弹是否超出屏幕边界
                if (enemyBullets[i].y > canvas.height || 
                    enemyBullets[i].x < 0 || 
                    enemyBullets[i].x > canvas.width ||
                    enemyBullets[i].y < 0) {
                    enemyBullets.splice(i, 1);
                }
            }
        }
        
        // 如果敌方子弹过多，清理最旧的
        if (enemyBullets.length > MAX_ENEMY_BULLETS) {
            enemyBullets.splice(0, enemyBullets.length - MAX_ENEMY_BULLETS);
        }
        
        // 更新和绘制粒子（限制数量，防止性能问题）
        const maxParticlesToProcess = Math.min(particles.length, MAX_PARTICLES);
        for (let i = particles.length - 1; i >= 0; i--) {
            if (i < maxParticlesToProcess) {
                particles[i].update();
                particles[i].draw();
            }
            
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }
        
        // 如果粒子过多，清理最旧的
        if (particles.length > MAX_PARTICLES) {
            particles.splice(0, particles.length - MAX_PARTICLES);
        }
        
        // 更新和绘制爆炸效果（限制数量防止性能问题）
        const MAX_EXPLOSIONS = 10;
        for (let i = explosions.length - 1; i >= 0; i--) {
            if (i < explosions.length) { // 安全检查
                explosions[i].update();
                explosions[i].draw();
                
                if (explosions[i].isDead()) {
                    explosions.splice(i, 1);
                }
            }
        }
        
        // 如果爆炸效果过多，清理最旧的
        if (explosions.length > MAX_EXPLOSIONS) {
            explosions.splice(0, explosions.length - MAX_EXPLOSIONS);
        }
        
        // 碰撞检测
        checkCollisions();
        
        // 更新UI
        document.getElementById('lives').textContent = lives;
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('coins').textContent = coins;
        
        const bulletTypeNames = ['普通', '双发', '激光', 'S型'];
        document.getElementById('bulletType').textContent = bulletTypeNames[bulletType - 1];
    } else if (gameState === 'menu') {
        // 绘制菜单
        drawStars();
        ctx.fillStyle = '#00ffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('闪电游戏', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '24px Arial';
        ctx.fillText('点击开始按钮开始游戏', canvas.width / 2, canvas.height / 2 + 20);
    }
    } catch (error) {
        console.error('游戏循环错误:', error);
        // 发生错误时重置游戏状态
        gameState = 'menu';
    }
    
    requestAnimationFrame(gameLoop);
}

// 事件监听
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // 切换子弹类型
    if (e.key === '1') bulletType = 1;
    if (e.key === '2') bulletType = 2;
    if (e.key === '3') bulletType = 3;
    if (e.key === '4') bulletType = 4;
    
    // 防止空格键滚动页面
    if (e.key === ' ') {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 开始按钮
document.getElementById('startBtn').addEventListener('click', () => {
    if (gameState === 'menu' || gameState === 'gameOver') {
        gameState = 'playing';
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('coinBtn').style.display = 'none';
        document.getElementById('bossHealthBar').style.display = 'none';
    } else if (gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('startBtn').textContent = '继续';
    } else if (gameState === 'paused') {
        gameState = 'playing';
        document.getElementById('startBtn').textContent = '开始游戏';
    }
});

// 投币按钮
document.getElementById('coinBtn').addEventListener('click', () => {
    if (coins > 0 && lives <= 0) {
        coins--; // 消耗1个币
        lives += 10; // 增加10个生命
        gameState = 'playing';
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('coinBtn').style.display = 'none';
        
        // 重置玩家状态
        player.invulnerable = 120; // 复活后2秒无敌
        player.hurtFlash = 30;
        player.x = canvas.width / 2;
        player.y = canvas.height - 80;
        
        // 清理所有子弹和敌人，避免复活后立即死亡
        bullets = [];
        enemyBullets = [];
        enemies = [];
        particles = [];
        explosions = [];
        
        // 隐藏Boss相关UI
        if (boss) {
            boss = null;
            bossSpawned = false;
        }
        document.getElementById('bossPanel').style.display = 'none';
        document.getElementById('bossHealthBar').style.display = 'none';
        
        // 更新UI
        document.getElementById('lives').textContent = lives;
        document.getElementById('coins').textContent = coins;
        
        // 如果没有币了，禁用按钮
        if (coins <= 0) {
            document.getElementById('coinBtn').disabled = true;
        }
    }
});

// 重置按钮
document.getElementById('resetBtn').addEventListener('click', () => {
    gameState = 'menu';
    score = 0;
    lives = 10;
    coins = 5; // 重置币数
    level = 1;
    bulletType = 1;
    bossSpawned = false;
    lastBossScore = 0;
    bullets = [];
    enemyBullets = [];
    enemies = [];
    boss = null;
    particles = [];
    explosions = [];
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
    player.shootCooldown = 0;
    player.invulnerable = 0;
    player.hurtFlash = 0;
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('bossPanel').style.display = 'none';
    document.getElementById('bossHealthBar').style.display = 'none';
    document.getElementById('coinBtn').style.display = 'none';
    document.getElementById('coinBtn').disabled = false;
    document.getElementById('startBtn').textContent = '开始游戏';
    document.getElementById('lives').textContent = lives;
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('coins').textContent = coins;
});

// 初始化
initStars();
gameLoop();
