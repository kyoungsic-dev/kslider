'use strict';

function kslider(options) {
  // 옵션
  const {
    sliderWidth,
    sliderHeight,
    mainSlideWidth,
    useThumbnail = true,
    speed = 500,
    easing = 'linear',
    autoPlay = true,
    autoPlaySpeed = 3000,
    autoPlayReverse = false,
    dots = false,
    controlNav = false,
    pauseOnHover = true,
  } = options;

  /**
   * * 전역 스코프 초기화
   * 슬라이드 애니메이션이 원활하게 동작하기 위해서는 슬라이드 노드가 최소 4개여야 하기 때문에
   * 슬라이드 개수가 2~3개일 때의 케이스를 고려해 변수 triggerCloneNode에 슬라이드 노드를 복제한다.
   */
  const trigger = document.querySelector(`${options.trigger}`);
  const triggerCloneNode = trigger.cloneNode(true).children;
  const slideLen = trigger.children.length === 2 ? 3 : trigger.children.length === 3 ? 5 : trigger.children.length - 1;
  const totalNum = trigger.children.length;
  const animationEasing = `transform ${easing} ${speed}ms`;
  let mainSlide,
    thumbSlide,
    slidesArray = [],
    currentIndex,
    isPaused = false,
    isAutoPlay,
    isMove = false;

  /**
   * * 전체 슬라이더 생성 함수
   * 1. 변수 triggerClone에 슬라이드 노드를 복제한다. (메인/썸네일 슬라이더 DOM이 생성되면 각 슬라이더에 슬라이드를 렌더링하기 위해)
   * 2. 슬라이더 사이즈 옵션 값으로 전체 슬라이더 DOM을 생성하고 반환한다.
   * 3. createMainSlide(), createThumbnailSlide() 함수를 호출해 복제한 triggerClone를 파라미터로 전달해 메인/썸네일 슬라이더를 생성한다.
   *    이때 useThumbnail 옵션으로 썸네일 슬라이더의  생성 유무를 정할 수 있다.
   */
  function createSlides() {
    trigger.classList.add('kslider');
    trigger.style.cssText = `width: ${sliderWidth};`;
    const triggerClone = trigger.cloneNode(true).children;
    [...trigger.children].forEach(node => node.remove());

    const slideWrapDiv = document.createElement('div');
    slideWrapDiv.classList.add('kslider-wrap');
    slideWrapDiv.style.cssText = `display: flex; height: ${sliderHeight};`;
    trigger.insertAdjacentElement('afterbegin', slideWrapDiv);

    createMainSlide(slideWrapDiv, triggerClone);
    useThumbnail && createThumbnailSlide(slideWrapDiv);
  }

  /**
   * * 메인 슬라이더 생성 함수
   * 1. 메인 슬라이더 DOM 생성 (option mainSlideWidth 사이즈로 렌더링되며 썸네일 슬라이더가 없는 경우 width는 100%)
   * 2. createSlides() 파라미터로 전달 받은 슬라이드 리스트 노드를 메인 슬라이더에 삽입
   * 3. 슬라이드 리스트 노드 개수가 2~3개 일 때 전역 스코프에서 복제 해둔 슬라이드 노드를 추가 삽입
   * 4. createSlides() 파라미터로 전달 받은 전체 슬라이더 노드의 자식 노드로 반환
   * 5. createArrows()에 메인 슬라이더 노드를 인자로 전달 받아 버튼을 삽입
   */
  function createMainSlide(wrap, slideNodes) {
    const main = document.createElement('div');
    main.classList.add('kslider-main');
    wrap.insertAdjacentElement('beforeend', main);
    main.style.cssText = `width: ${useThumbnail ? mainSlideWidth : '100%'};`;

    const mainSlides = document.createElement('div');
    mainSlides.classList.add('kslider-main__slides');

    const mainSlideArray =
      slideLen === 3
        ? [...triggerCloneNode, ...slideNodes]
        : slideLen === 5
        ? [...triggerCloneNode, ...slideNodes]
        : [...slideNodes];
    mainSlideArray.map(child => {
      mainSlides.insertAdjacentElement('beforeend', child);
      child.classList.add('kslider-main__slide');
    });

    main.insertAdjacentElement('afterbegin', mainSlides);

    createArrows(main);
    mainSlide = trigger.querySelectorAll('.kslider-main__slide');
  }

  /**
   * * 썸네일 슬라이더 생성 함수
   * 1. 썸네일 슬라이더 DOM 생성
   * 2. 메인 슬라이더의 슬라이드 노드를 복제해 썸네일 슬라이더에 반환
   * 3. createSlides() 파라미터로 전달 받은 전체 슬라이더 노드의 자식 노드로 반환
   * 4. createArrows()에 썸네일 슬라이더 노드를 인자로 전달 받아 버튼을 삽입
   *
   */
  function createThumbnailSlide(wrap) {
    const thumbnail = document.createElement('div');
    thumbnail.classList.add('kslider-thumbnail');
    wrap.insertAdjacentElement('beforeend', thumbnail);

    const thumbnailSlides = document.createElement('div');
    thumbnailSlides.classList.add('kslider-thumbnail__slides');

    // 메인 슬라이더의 노드 복사
    const copyMainSlide = trigger.querySelector('.kslider-main__slides').cloneNode(true).children;
    [...copyMainSlide].map(child => {
      thumbnailSlides.insertAdjacentElement('beforeend', child);
      child.classList.remove('kslider-main__slide');
      child.classList.add('kslider-thumbnail__slide');
    });

    thumbnail.insertAdjacentElement('afterbegin', thumbnailSlides);

    createArrows(thumbnail);
    thumbSlide = trigger.querySelectorAll('.kslider-thumbnail__slide');
  }

  /**
   * * 메인/썸네일 각 슬라이더에 이전/다음 버튼 생성 함수
   * 1. 슬라이드 개수가 1개 일 때 버튼이 생성될 필요 없으므로 early return
   * 2. controlNav 옵션 사용 시 버튼은 하단에 렌더링 되야 함으로 early return
   * 3. 이전/다음 버튼을 생성하여 각 슬라이더 생성 함수의 콜백 함수로 반환
   */
  function createArrows(slideWrap) {
    if (slideLen === 0) return;
    if (controlNav) return;

    // 이전 버튼
    const prevBtn = document.createElement('button');
    prevBtn.classList.add('kslider__prev');
    prevBtn.innerText = '이전';

    // 다음 버튼
    const nextBtn = document.createElement('button');
    nextBtn.classList.add('kslider__next');
    nextBtn.innerText = '다음';

    slideWrap.insertAdjacentElement('beforeend', prevBtn);
    slideWrap.insertAdjacentElement('beforeend', nextBtn);
  }

  /**
   * * 각 슬라이더 내부 이미지의 위치 세팅하는 함수
   * 1. 슬라이드 개수가 1개 일 때 위치 조정이 필요 없으므로 early return
   * 2. 전역 스코프 변수 slideArray에 파라미터로 받아온 메인/썸네일 슬라이더를 배열로 할당
   * 3. slideArray를 반복문으로 각 슬라이더 안의 리스트에 css transform 속성으로 위치 지정 (메인 슬라이더 = X축, 썸네일 슬라이더 = Y축)
   * 4. useThumbnail 옵션 값이 false일 때를 대비하여 thumbNailSlide 인자 값을 디폴트 파라미터 false 할당
   * 5. slideArray를 루프할 때 썸네일 슬라이더가 없으면 early return
   * 6. 각 슬라이드에 위치를 지정하면서 data-index 사용자 지정 속성 값 부여
   * 7. 이미지 지연 로딩 함수 호출
   */
  function setSlide(mainSlide, thumbSlide = false) {
    // 슬라이드 개수가 1개 일때
    if (slideLen === 0) return;

    slidesArray = [mainSlide, thumbSlide];
    slidesArray.forEach((slides, slidesIdx) => {
      // 메인/썸네일 슬라이드 transform 속성 구분 (x/y)
      const translate = slidesIdx === 0 ? 'translateX' : 'translateY';

      if (slides) {
        const slideDirection = slidesIdx === 0 ? slides[0].clientWidth : slides[0].clientHeight;

        // 각 슬라이드에 index를 dataset (마지막 노드는 prev 슬라이드 전환을 위해 -1로 set)
        slides.forEach((slide, idx) => {
          slide.dataset.index = idx === slideLen ? -1 : idx;
          idx !== slideLen
            ? (slide.style.transform = `${translate}(${idx * slideDirection}px)`)
            : (slide.style.transform = `${translate}(${slideDirection * -1}px)`);

          imgLazyLoad(slide);
        });
      }
    });
  }

  /**
   * * 이미지 지연 로딩 함수
   * ! 슬라이드 개수가 1개일 때 setSlide() 함수 로직이 실행되지 않음으로 슬라이드 개수가 1개일 때는 이미지 지연 로딩 사용불가
   * 1. 이미지 src 정보가 있으면 early return
   * 2. 각 슬라이더 안의 슬라이드 index 값을 인자로 받아와 변수 index에 할당
   * 3. 이미지 src 정보가 없으면 슬라이드 이미지 태그 data-src 속성의 이미지 경로 값을 변수 dataSrc에 할당
   * 4. index값이 -1, 0, 1, 2 (이전, 현재, 다음, 다음) 이미지만 우선 로딩
   * ? 이미지 4개를 로딩하는 이유 : 썸네일 슬라이더 기준 노출 상태의 이미지 2개이기 때문에 이전/다음 이미지 2개를 포함하여 우선 로드하도록 구현
   */
  function imgLazyLoad(slide) {
    // 이미지 src 정보가 있으면 early return
    if (slide.firstElementChild.attributes.src.nodeValue) return;

    const index = parseInt(slide.dataset.index);
    const dataSrc = slide.firstElementChild.dataset.src;

    switch (true) {
      case [-1, 0, 1, 2].includes(index):
        slide.firstElementChild.attributes.src.nodeValue = dataSrc;
        break;
      default:
        break;
    }
  }

  // 슬라이드 전환 (인자 : prev, next)
  function moveSlide(direction) {
    if (!isMove) {
      if (autoPlay) {
        autoPlayStop();
        autoPlayInit(isPaused);
      }

      // 이전, 다음 버튼의 중복 클릭으로 인한 전환 딜레이 방지
      isMove = true;

      // 메인/썸네일 슬라이더에 다른 슬라이드 방향 설정
      slidesArray.forEach((slides, slidesIdx) => {
        const translate = slidesIdx === 0 ? 'translateX' : 'translateY';
        const mainCaseArray = direction === 'prev' ? [-1, 0] : [0, 1];
        const thumbCaseArray = direction === 'prev' ? [-1, 0, 1] : [0, 1, 2];

        if (slides) {
          // 메인/썸네일 슬라이드 transition 효과를 다르게 할당
          const slideDirection = slidesIdx === 0 ? slides[0].clientWidth : slides[0].clientHeight;
          const caseArray = slidesIdx === 0 ? [...mainCaseArray] : [...thumbCaseArray];

          slides.forEach(slide => {
            const slideDataIndex = parseInt(slide.dataset.index);

            // 이전
            if (direction === 'prev') {
              slide.dataset.index = slideDataIndex === slideLen - 1 ? -1 : slideDataIndex + 1;
            }
            // 다음
            else if (direction === 'next') {
              slide.dataset.index = slideDataIndex < 0 ? slideLen - 1 : slideDataIndex - 1;
            }

            imgLazyLoad(slide);

            // 현재 노출된 슬라이드의 인덱스 구하기
            if (parseInt(slide.dataset.index) === 0) {
              currentIndex = Array.from(slides).indexOf(slide);
              dots && activeDots(currentIndex);
              controlNav && navProgress(currentIndex);
            }

            // 슬라이드 전환 애니메이션
            switch (true) {
              case caseArray.includes(slideDataIndex):
                slide.style.transition = animationEasing;
                slide.style.zIndex = 2;
                break;
              default:
                slide.style.transition = `unset`;
                slide.style.zIndex = 1;
                break;
            }
            slide.style.transform = `${translate}(${parseInt(slide.dataset.index) * slideDirection}px)`;
          });
        }
      });

      // speed 옵션으로 슬라이드가 전환되는 속도 설정
      setTimeout(() => {
        isMove = false;
      }, speed);
    }
  }

  // 이전/다음 버튼 클릭 이벤트 핸들러
  function controlNavigation() {
    // 이전
    trigger.querySelectorAll('.kslider__prev').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        moveSlide('prev');
      });
    });

    // 다음
    trigger.querySelectorAll('.kslider__next').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        moveSlide('next');
      });
    });
  }

  // 슬라이더 자동 재생
  function autoPlaySlide() {
    autoPlayInit(isPaused);

    // 슬라이더에 hover/focus 시 자동 재생 멈춤 (pauseOnHover 옵션)
    if (pauseOnHover) {
      trigger.querySelector('.kslider-wrap').addEventListener('mouseover', e => {
        autoPlayStop();
      });
      trigger.querySelector('.kslider-wrap').addEventListener('mouseleave', e => {
        autoPlayInit(isPaused);
      });

      trigger.querySelectorAll('.kslider-wrap button').forEach(btn => {
        btn.addEventListener('focus', e => {
          autoPlayStop();
        });
      });
      trigger.querySelectorAll('.kslider-wrap button').forEach(btn => {
        btn.addEventListener('blur', e => {
          autoPlayInit(isPaused);
        });
      });
    }
  }

  // 자동 재생
  function autoPlayInit(isPaused) {
    if (isPaused) return false;
    autoPlayStop();
    isAutoPlay = setInterval(() => {
      autoPlayReverse ? moveSlide('prev') : moveSlide('next');
    }, autoPlaySpeed);
  }

  // 자동 재생 멈춤
  function autoPlayStop() {
    clearInterval(isAutoPlay);
  }

  /* ********************************************************************************************* */
  /* *************************************** CUSTOM OPTION *************************************** */
  /* ********************************************************************************************* */
  // Dots 생성
  function createDots() {
    // 슬라이드 목록의 개수가 1개일 때 early return
    if (slideLen === 0) return;

    const dotsDiv = document.createElement('div');
    dotsDiv.classList.add('kslider-dots');
    for (let i = 0; i < totalNum; i++) {
      const dot = document.createElement('button');
      dot.innerText = i + 1;
      dotsDiv.insertAdjacentElement('beforeend', dot);
      i === 0 && dot.classList.add('active');
    }
    trigger.insertAdjacentElement('beforeend', dotsDiv);
  }

  // 현재 노출된 슬라이더 index와 Dots의 index를 동기화 (스타일링)
  function activeDots(currentIndex) {
    if (slideLen === 0) return;

    if (slideLen === 3) {
      currentIndex = currentIndex >= 2 ? currentIndex - 2 : currentIndex;
    }
    trigger.querySelectorAll('.kslider-dots > button').forEach((dot, idx) => {
      if (idx !== currentIndex) dot.classList.remove('active');
      else dot.classList.add('active');
    });
  }

  // 하단 네비게이션 생성 (이전, 정지/재생, 다음, 프로그레스바)
  function createNav() {
    if (slideLen === 0) return;
    // 네비게이션 wrap
    const controlNav = document.createElement('nav');
    controlNav.classList.add('kslider-nav');

    // 네비게이션 buttons
    const btns = document.createElement('div');
    btns.classList.add('kslider-nav__btns');

    for (let i = 0; i < 3; i++) {
      const btn = document.createElement('button');
      switch (i) {
        case 0:
          btn.classList.add('kslider-nav__prev');
          btn.textContent = '이전';
          break;

        case 1:
          btn.classList.add('kslider-nav__toggle');
          btn.textContent = '정지';
          break;

        case 2:
          btn.classList.add('kslider-nav__next');
          btn.textContent = '다음';
          break;
      }
      btns.insertAdjacentElement('beforeend', btn);
    }

    controlNav.insertAdjacentElement('beforeend', btns);
    trigger.insertAdjacentElement('beforeend', controlNav);

    // 네비게이션 progress
    const total = totalNum < 10 ? `0${totalNum}` : totalNum;
    const progressWrap = document.createElement('div');
    progressWrap.classList.add('kslider-nav__progress');
    progressWrap.style.cssText = 'display: flex; align-items: center;';

    const progressCurrent = document.createElement('div');
    progressCurrent.classList.add('kslider-nav__current');
    progressCurrent.textContent = '01';

    const progressTrack = document.createElement('div');
    progressTrack.classList.add('kslider-nav__track');

    const progressFill = document.createElement('div');
    progressFill.classList.add('kslider-nav__fill');
    progressTrack.insertAdjacentElement('beforeend', progressFill);
    startProgressBar();

    const progressTotal = document.createElement('div');
    progressTotal.classList.add('kslider-nav__total');
    progressTotal.textContent = total;

    progressWrap.insertAdjacentElement('beforeend', progressCurrent);
    progressWrap.insertAdjacentElement('beforeend', progressTrack);
    progressWrap.insertAdjacentElement('beforeend', progressTotal);

    controlNav.insertAdjacentElement('beforeend', progressWrap);
    trigger.insertAdjacentElement('beforeend', controlNav);

    // 네비게이션 버튼 이벤트 핸들러 호출
    navBtns();
  }

  // 현재 슬라이드와 total 슬라이드 카운트
  function navProgress(currentIndex) {
    // 슬라이드가 2개일때
    if (slideLen === 3) {
      currentIndex = currentIndex >= 2 ? currentIndex - 2 : currentIndex;
    }
    currentIndex = currentIndex + 1 < 10 ? `0${currentIndex + 1}` : currentIndex + 1;
    trigger.querySelector('.kslider-nav__current').textContent = currentIndex;

    if (isPaused) return;
    resetProgressBar();
    startProgressBar();
  }

  // 프로그레스 바 채워지는 애니메이션
  function startProgressBar() {
    setTimeout(() => {
      trigger.querySelector(
        '.kslider-nav__fill',
      ).style.cssText = `transition: width ${autoPlaySpeed}ms linear; width: 100%;`;
    }, 1);
  }

  function resetProgressBar() {
    trigger.querySelector('.kslider-nav__fill').style.cssText = 'transition: unset; width: 0;';
  }

  // 네비게이션 버튼 이벤트
  function navBtns() {
    // 이전/다음 버튼
    trigger.querySelector('.kslider-nav__prev').addEventListener('click', e => {
      e.preventDefault();
      moveSlide('prev');
    });

    trigger.querySelector('.kslider-nav__next').addEventListener('click', e => {
      e.preventDefault();
      moveSlide('next');
    });

    // 자동 재생 재생/정지 버튼
    trigger.querySelector('.kslider-nav__toggle').addEventListener('click', e => {
      e.preventDefault();
      if (!e.currentTarget.classList.contains('paused')) {
        // 중지
        isPaused = true;
        e.currentTarget.classList.add('paused');
        e.currentTarget.textContent = '재생';
        resetProgressBar();
        autoPlayStop();
      } else {
        // 재생
        isPaused = false;
        e.currentTarget.classList.remove('paused');
        e.currentTarget.textContent = '정지';
        resetProgressBar();
        startProgressBar();
        autoPlayInit();
      }
    });
  }

  // 초기화
  function init() {
    createSlides();
    controlNav && createNav();
    dots && createDots();
    setSlide(mainSlide, thumbSlide);
    controlNavigation();
    autoPlay && autoPlaySlide();
  }

  init();
}
