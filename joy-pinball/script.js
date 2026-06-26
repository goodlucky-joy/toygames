const canvas = document.getElementById('pinballCanvas');
const ctx = canvas.getContext('2d');
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const rankList = document.getElementById('rankList');

// 게임 설정
let balls = [];
let pegs = [];
let rankings = [];
let isPlaying = false;

// 눈에 띄는 화려한 공 색상 목록
const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', '#33FFF0', '#FFA500', '#9A33FF'];

// 1. 장애물(못/Peg) 배치 생성 (격자 형태)
function initPegs() {
    pegs = [];
    const rows = 7;
    const cols = 8;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // 지그재그 배치를 위해 홀수 줄은 약간 우측으로 이동
            let x = 50 + c * 55 + (r % 2 === 0 ? 0 : 25);
            let y = 120 + r * 55;
            // 화면 안에 들어오는 장애물만 저장
            if (x < canvas.width - 20) {
                pegs.push({ x: x, y: y, radius: 6 });
            }
        }
    }
}

// 2. 공(Ball) 클래스 정의 (객체 지향 구조)
class Ball {
    constructor(name, x, color) {
        this.name = name;
        this.x = x;
        this.y = 30; // 출발 높이
        this.radius = 14;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 2; // 초기 좌우 속도 무작위
        this.vy = 1;                         // 초기 하강 속도
        this.gravity = 0.15;                 // 중력 가속도
        this.bounce = 0.5;                   // 탄성 계수 (반사력)
        this.isFinished = false;
    }

    update() {
        if (this.isFinished) return;

        // 중력 적용 및 위치 이동
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        // 벽면 충돌 처리 (좌우 벽)
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -this.bounce;
        } else if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -this.bounce;
        }

        // 장애물(Peg)과의 충돌 검사 (피타고라스 정리 활용)
        pegs.forEach(peg => {
            let dx = this.x - peg.x;
            let dy = this.y - peg.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius + peg.radius) {
                // 충돌 시 밀려나기 및 튕기기
                let angle = Math.atan2(dy, dx);
                this.x = peg.x + Math.cos(angle) * (this.radius + peg.radius);
                this.y = peg.y + Math.sin(angle) * (this.radius + peg.radius);
                
                // 속도 벡터 반사 및 무작위성 추가(더 역동적인 움직임)
                let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                this.vx = Math.cos(angle) * speed * this.bounce + (Math.random() - 0.5) * 1;
                this.vy = Math.sin(angle) * speed * this.bounce;
            }
        });

        // 바닥 도착 판정
        if (this.y + this.radius >= canvas.height) {
            this.y = canvas.height - this.radius;
            this.isFinished = true;
            recordRank(this.name);
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.closePath();

        // 공 위에 이름 쓰기
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.name.substring(0, 3), this.x, this.y + 4);
    }
}

// 3. 순위 기록 함수
function recordRank(name) {
    if (!rankings.includes(name)) {
        rankings.push(name);
        
        // 화면에 실시간 순위 반영
        const li = document.createElement('li');
        li.textContent = `${rankings.length}등: ${name}`;
        rankList.appendChild(li);
    }
}

// 4. 애니메이션 루프
function animate() {
    if (!isPlaying) return;
    
    // 잔상 효과를 주며 화면 지우기 (세련된 시각 효과)
    ctx.fillStyle = 'rgba(22, 36, 71, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 장애물 그리기
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#4ecca3';
        ctx.fill();
        ctx.closePath();
    });

    // 바닥 안전선/도착점 표시
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 5);
    ctx.lineTo(canvas.width, canvas.height - 5);
    ctx.stroke();

    // 공 업데이트 및 그리기
    balls.forEach(ball => {
        ball.update();
        ball.draw();
    });

    requestAnimationFrame(animate);
}

// 5. 이벤트 리스너 (시작 및 초기화)
startBtn.addEventListener('click', () => {
    if (isPlaying) return;

    const names = nameInput.value.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) {
        alert('이름을 하나 이상 입력해주세요!');
        return;
    }

    rankings = [];
    rankList.innerHTML = '';
    balls = [];
    
    // 입력받은 이름만큼 공 생성 및 상단에 무작위 배치
    names.forEach((name, index) => {
        let startX = 50 + Math.random() * (canvas.width - 100);
        let color = colors[index % colors.length];
        balls.push(new Ball(name, startX, color));
    });

    isPlaying = true;
    animate();
});

resetBtn.addEventListener('click', () => {
    isPlaying = false;
    balls = [];
    rankings = [];
    rankList.innerHTML = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    initPegs();
    // 초기 화면에 장애물만 먼저 그려두기
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#4ecca3';
        ctx.fill();
        ctx.closePath();
    });
});

// 초기화 실행
initPegs();
resetBtn.click();
