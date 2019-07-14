



class EventHub{
  constructor(){
    this.__ON_MESSAGE_COMMUNICATION__ = "__ON_MESSAGE_COMMUNICATION__";// 监听事件传递msg类型
    this.__DISPATCH_MESSAGE_COMMUNICATION__ = "__DISPATCH_MESSAGE_COMMUNICATION__";// 顶层 派发事件传递msg类型
    this.__DISPATCH_MESSAGE_COMMUNICATION_DEAL__ = "__DISPATCH_MESSAGE_COMMUNICATION_DEAL__";// 子 派发事件传递msg类型 
    this.__OFF_TOPWINDOW_MESSAGE_COMMUNICATION__ = "__OFF_TOPWINDOW_MESSAGE_COMMUNICATION__";// 取消顶层事件订阅
    this.__OFF_TOPWINDOW_MESSAGE_COMMUNICATION_DEAL__ = "__OFF_TOPWINDOW_MESSAGE_COMMUNICATION_DEAL__";// 取消顶层事件订阅 处理
    this.init();
  }
  init(){
    // 注册事件 一个页面只能注册一次
    this.addWindowMessageListener();
  }
  // 添加 message 事件
  addWindowMessageListener(){
    let _this = this;
    window.addEventListener("message",function(e){
      console.log(`${window.name || "topWindow"} 接收到消息`,e.data);
      if(e && e.data && e.data.type === _this.__ON_MESSAGE_COMMUNICATION__){
        // 接收到订阅消息处理
        _this.onMsgHandler(e);
      }
      if(e && e.data && e.data.type === _this.__DISPATCH_MESSAGE_COMMUNICATION__){
        // 顶层派发事件处理
        _this.dispatchMsgHandler(e);
      }
      if(e && e.data && e.data.type === _this.__DISPATCH_MESSAGE_COMMUNICATION_DEAL__){
        // iframe里面事件处理
        _this.dispatchMsgDealHandler(e);
      }
      if(e && e.data && e.data.type === _this.__OFF_TOPWINDOW_MESSAGE_COMMUNICATION__){
        // 取消顶层订阅
        _this.offTopWindowEventHandler(e);
      }
    })
    this.setEveryIframeEventList();
  }
  // 初始化 事件容器
  setEveryIframeEventList(){
    // iframeEvents 每个iframe 事件容器 包含回调函数 一个window只能监听一次
    Object.defineProperty(window,"iframeEvents",{
      configurable: false,
      writable: false,
      value:[]//[{eventType:"",callbacks:[]}]
    });
    // topWindowEvents 顶层事件容器 不包含回调 一个window只能监听一次
    Object.defineProperty(window,"topWindowEvents",{
      configurable: false,
      writable: false,
      value:[]//[{eventType:"",paths:[ [""] ]}]
    });
  }
  // 接收到订阅消息处理
  onMsgHandler(e){
    let _this = this;
    // 监听
    let isTopWindow = _this.isTopWindow();
    let communicationMsg = e.data;
    /**
     * communicationMsg 结构
     * let communicationMsg = {
        type:this.__ON_MESSAGE_COMMUNICATION__,
        eventItem:{
          eventType:eventType,
          path:[window.name],
        }
      }
     */
    if(isTopWindow){
      // topwindow存事件类型 和 iframe 路径 事件类型 和 事件路径 是否全一致
      let topWindowEventsItem = window.topWindowEvents.find(v => {
        let isSameEventType = v.eventType == communicationMsg.eventItem.eventType;
        let isSamePath = v.paths.some(v1 => {
          let topWindowPathItem = v1;// [1,2,3]
          let newPathItem = communicationMsg.eventItem.path;// [1,2,3]
          let isWeakEqual = topWindowPathItem.every((v2,i2) => newPathItem.indexOf(v2) === i2);
          return isWeakEqual && (topWindowPathItem.length === newPathItem.length);
        });
        return isSamePath && isSameEventType;
      });
      // 事件是否存在
      let topWindowEventType = window.topWindowEvents.find(v => v.eventType === communicationMsg.eventItem.eventType);
      
      if(topWindowEventType){
        // 事件类型存在
        if(topWindowEventsItem){
          // 事件类型 事件地址是否全一致 全一致， 则不处理
        }else{
          topWindowEventType.paths.push(communicationMsg.eventItem.path);
        }
      }else{
        // 事件类型不存在
        let topEventItem = {
          eventType:communicationMsg.eventItem.eventType,
          paths:[communicationMsg.eventItem.path]
        };
        window.topWindowEvents.push(topEventItem);
      }
    }else{
      // 往上传递
      communicationMsg.eventItem.path.unshift(window.name);
      window.parent.postMessage(communicationMsg,"*");
    }
  }
  // 顶层派发事件处理
  dispatchMsgHandler(e){
    let _this = this;
    let communicationMsg = e.data;
    /**
     * communicationMsg 结构
     let communicationMsg = {
        type:this.__DISPATCH_MESSAGE_COMMUNICATION__,
        eventItem:{
          eventType:eventType,
          args:args
        }
      }
      */
    /**
     * topWindowEvents
     * 
     * {eventType:"",paths:[ [""],["1"] ]}]
     */
    let eventType = communicationMsg.eventItem.eventType;
    let topWindowEventsItem = window.topWindowEvents.find(v => v.eventType === eventType);
    if(topWindowEventsItem){
      // 向子iframe 派发事件
      /**
       * topWindowEventsItem
        {
          "eventType":"aaa",
          "paths":[["iframe2","iframe2_1"],[""],["iframe2","iframe2_1","iframe2_1_1"]]
        }
        */
      for(let i=0;i<topWindowEventsItem.paths.length;i++){
        let curWindow = window;
        let path = topWindowEventsItem.paths[i].filter(v => Boolean(v));
        while(path.length !== 0){
          curWindow = curWindow[path.shift()];
        }
        let communicationMsgDeal = {
          type:_this.__DISPATCH_MESSAGE_COMMUNICATION_DEAL__,
          eventItem:{
            eventType:eventType,
            args:communicationMsg.eventItem.args
          }
        }
        curWindow.postMessage(communicationMsgDeal,"*");
      }
    }else{
      console.log("没找到事件类型::",eventType);
    }
  }
  // iframe里面事件处理
  dispatchMsgDealHandler(e){
    let _this = this;
    // 派发 处理
    let communicationMsg = e.data;
    /**
     * communicationMsg 结构
     {
        type:_this.__DISPATCH_MESSAGE_COMMUNICATION_DEAL__,
        eventItem:{
          eventType:eventType,
          args:communicationMsg.eventItem.args
        }
      }
     */
    let eventType = communicationMsg.eventItem.eventType;
    let args = communicationMsg.eventItem.args;
    let iframeEventsItem = window.iframeEvents.find(v => v.eventType == eventType);
    if(iframeEventsItem){
      let callbacks = iframeEventsItem.callbacks;
      for(let i=0;i<callbacks.length;i++){
        if((typeof callbacks[i]) == "function"){
          callbacks[i](args,eventType);
        }
      }
    }else{
      console.error(`没有找到事件类型为 ${eventType} 的回调函数`)
    }
  }
  // 取消顶层订阅
  offTopWindowEventHandler(e){
    // 往上传递
    let _this = this;
    let communicationMsg = e.data;
    /**
     * communicationMsg 结构
     * {
        type:this.__ON_MESSAGE_COMMUNICATION__,
        eventItem:{
          eventType:eventType,
          path:[window.name],
        }
      }
     */
    let isTopWindow = _this.isTopWindow();
    if(isTopWindow){
      let eventType = communicationMsg.eventItem.eventType;
      let topWindowEventsItem = window.topWindowEvents.find(v => v.eventType === eventType);
      if(topWindowEventsItem){
        // 当前类型需要取消的路径[1,2,3]
        let needOffWindowPath = communicationMsg.eventItem.path;
        // 顶层当前类型所有的路径[[1,2,3],[2,3,4]]
        let topWindowPaths = topWindowEventsItem.paths;
        // 去除一个路径的类型监听
        topWindowEventsItem.paths = topWindowEventsItem.paths.filter(path => {
          let isWeakEquql = path.every((v,i) => needOffWindowPath.indexOf(v) == i);
          return !(isWeakEquql && (path.length === needOffWindowPath.length));
        });
        if(topWindowEventsItem.paths.length === 0){
          // 去除整个监听
          let index = window.topWindowEvents.findIndex(v => v.eventType == eventType);
          if(index !== -1){
            window.topWindowEvents.splice(index,1);
          }else{
            console.info("顶层window没有找到",eventType,"取消事件");
          }
        }
      }else{
        console.log("顶层window事件类型",eventType,"不存在");
      }
    }else{
      communicationMsg.eventItem.path.unshift(window.name);
      window.parent.postMessage(communicationMsg,"*");
    }
    
  }

  
  
  // 获取顶层 window
  getTopWindow(){
    let tempWindow = window;
    while(tempWindow !== tempWindow.parent){
      tempWindow = tempWindow.parent;
    }
    return tempWindow;
  }
  // 是否是顶层window
  isTopWindow(){
    return window.parent === window;
  }
  /**
   * 添加事件
   * @param {String} eventType 事件类型
   * @param {Function} callback 回调函数
   */
  on(eventType,callback){
    if(!eventType || (typeof callback) !== "function"){
      throw new Error("eventType,callback 必传");
    }
    // 给本window 挂事件
    let existEventItem = window.iframeEvents.find(v => v.eventType === eventType);
    if(existEventItem){
      if(!existEventItem.callbacks.includes(callback)){
        existEventItem.callbacks.push(callback);
      }
    }else{
      let eventItem = {
        eventType:eventType,
        callbacks:[callback]
      };
      window.iframeEvents.push(eventItem);
    }
    // 给 top window 挂事件
    let communicationMsg = {
      type:this.__ON_MESSAGE_COMMUNICATION__,
      eventItem:{
        eventType:eventType,
        path:[window.name],
      }
    }
    window.parent.postMessage(communicationMsg,"*");
  }
  /**
   * 派发事件
   * @param {String} eventType 事件类型
   * @param {Object} args 回调参数
   */
  dispatch(eventType,args){
    let communicationMsg = {
      type:this.__DISPATCH_MESSAGE_COMMUNICATION__,
      eventItem:{
        eventType:eventType,
        args:args
      }
    }
    let topWindow = this.getTopWindow();
    topWindow.postMessage(communicationMsg,"*");
  }
  /**
   * 取消顶层事件
   * @param {String} type 类型
   */
  offTopWindowEvent(type){
    let _this = this;
    let communicationMsgDeal = {
      type:_this.__OFF_TOPWINDOW_MESSAGE_COMMUNICATION__,
      eventItem:{
        eventType:type,
        path:[window.name]
      }
    }
    window.parent.postMessage(communicationMsgDeal,"*");
  }
  /**
   * 取消本iframe 的事件 再发消息取消top window的事件  暂时只按类型取消订阅
   * @param {String} type 类型
   */
  offIframeEvent(type){
    let index = window.iframeEvents.findIndex(v => v.eventType === type);
    window.iframeEvents.splice(index,1);
    this.offTopWindowEvent(type);
  }
}

var a = new EventHub();