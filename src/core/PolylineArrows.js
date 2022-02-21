import defaultValue from '../utils/defaultValue';

class PolylineArrows {
    constructor(mapType, map, data, icon, opts = {}) {
        this.mapType = mapType; // 地图类型，支持['BMap','BMapGL']
        this.map = map // 地图实例化对象
        this.data = data; // GeoJSON格式的Polyline数据
        this.icon = icon; // 箭头图标
        this.step = defaultValue(opts.step, 90); // 箭头间距，单位px
        this.iconSize = defaultValue(opts.iconSize, { x: 12, y: 12 }); // 箭头大小，单位px
        this.correctAngle = defaultValue(opts.correctAngle, 0); // 图标角度校正：图标的起始角度应该对准水平轴朝右（---->），单位：角度制

        this.linePoints = []; // 扁平化线路坐标数组
        this.arrowOverlays = []; // 箭头覆盖物容器
        this.refreshHandlerFunc = null; // 箭头更新处理函数

        this.parseLineData();
        this.initRefreshEvent();
        this.dispatchArrows();
    }

    /**
     * 解析线路数据
     */
    parseLineData() {
        let geo = this.data.geometry;
        if (!geo) return;

        let { type } = geo;
        switch (type) {
            case 'LineString':
                this.linePoints = geo.coordinates;
                break;
            case 'MultiLineString':
                this.linePoints = geo.coordinates.flat();
                break;
            default:
                console.error('error polyline data!');
                break;
        }
    }

    /**
     * 初始化箭头更新事件
     * 地图平移和缩放结束时触发
     */
    initRefreshEvent() {
        this.refreshHandlerFunc = this.refreshHandler.bind(this);

        if (this.linePoints && this.linePoints.length > 1) {
            this.map.addEventListener('moveend', this.refreshHandlerFunc);
            this.map.addEventListener('zoomend', this.refreshHandlerFunc);
        }
    }

    /**
     * 地图平移缩放结束事件处理
     */
    refreshHandler() {
        this.dispatchArrows();
    }

    /**
    * 箭头绘制调度中心
    */
    dispatchArrows() {
        let that = this;
        that.clearArrows();

        let step = that.step;
        let remainingLen = 0; // 剩余像素长度
        let currentStart = that.pointToPixel(that.linePoints[0][0], that.linePoints[0][1]);
        let arrowNode = {};
        for (let i = 0; i < that.linePoints.length - 1; i++) {
            let currentLinePoint = that.linePoints[i];
            let nextLinePoint = that.linePoints[i + 1];

            let start = that.pointToPixel(currentLinePoint[0], currentLinePoint[1]);
            let end = that.pointToPixel(nextLinePoint[0], nextLinePoint[1]);
            let [dx, dy] = [end.x - start.x, start.y - end.y];
            if (dx === 0 && dy === 0) {
                // 两节点太近，忽略这段距离
                continue;
            }

            // 两点旋转角度差
            let rotation = Math.atan2(dy, dx);

            // 两点像素距离
            let nodeDist;
            if (rotation === 0) {
                // dy=0的情况
                nodeDist = dx;
            } else {
                nodeDist = dy / Math.sin(rotation);
            }

            if (Number(nodeDist + remainingLen) < Number(step)) {
                // 两节点间距过短
                remainingLen += nodeDist;
                currentStart = end;
            } else {
                if (remainingLen == 0) {
                    let splitNum = Math.floor(nodeDist / step);
                    let Y = -Math.sin(rotation) * step;
                    let X = Math.cos(rotation) * step;
                    for (let i = 0; i < splitNum; i++) {
                        arrowNode.x = currentStart.x + X;
                        arrowNode.y = currentStart.y + Y;
                        currentStart = arrowNode;

                        that.addArrow(arrowNode, rotation);
                    }

                    remainingLen = nodeDist % step;
                    currentStart = end;
                } else {
                    let littleStep = step - remainingLen;
                    let Y = -Math.sin(rotation) * littleStep;
                    let X = Math.cos(rotation) * littleStep;
                    arrowNode.x = currentStart.x + X;
                    arrowNode.y = currentStart.y + Y;
                    currentStart = arrowNode;

                    that.addArrow(arrowNode, rotation);

                    remainingLen = (nodeDist - littleStep) % step;
                    let splitNum = Math.floor((nodeDist - littleStep) / step);
                    Y = -Math.sin(rotation) * step;
                    X = Math.cos(rotation) * step;
                    for (let i = 0; i < splitNum; i++) {
                        arrowNode.x = currentStart.x + X;
                        arrowNode.y = currentStart.y + Y;
                        currentStart = arrowNode;

                        that.addArrow(arrowNode, rotation);
                    }
                    currentStart = end;
                }
            }
        }
    }

    /**
     * 新增箭头
     * @param arrowNode 箭头对象
     * @param rotation 旋转角度
     */
    addArrow(arrowNode, rotation) {
        let seeExtent = this.map.getBounds();
        let arrowPoint = this.pixelToPoint(arrowNode.x, arrowNode.y);

        // 仅在屏幕可视区域内加载
        if (seeExtent.containsPoint(arrowPoint)) {
            let currrentAngle = (rotation / Math.PI) * 180 - this.correctAngle;
            this.drawArrow(arrowPoint, -currrentAngle);
        }
    }

    /**
     * 使用百度地图API绘制箭头
     * @param arrowPoint 箭头像素坐标
     * @param rotation 旋转角度
     */
    drawArrow(arrowPoint, rotation) {
        let marker = this.createMarker(arrowPoint);
        marker.setRotation(rotation);

        this.map.addOverlay(marker);
        this.arrowOverlays.push(marker);
    }

    /**
     * 清除箭头
     */
    clearArrows() {
        this.arrowOverlays.forEach((overlay) => {
            this.map.removeOverlay(overlay);
        });

        this.arrowOverlays = [];
    }

    /**
     * 设置箭头可见性
     * @param visible 可见性
     */
    setArrowsVisible(visible) {
        this.arrowOverlays.forEach((overlay) => {
            if (visible) {
                overlay.show();
            } else {
                overlay.hide();
            }
        });
    }

    /**
     * 更新箭头数据
     * @param newData 新箭头数据
     */
    updateData(newData) {
        this.data = newData;
        this.parseLineData();
        this.clearArrows();
        this.dispatchArrows();
    }

    /**
     * 经纬度坐标转屏幕坐标
     * @param lng 经度
     * @param lat 纬度
     */
    pointToPixel(lng, lat) {
        let pixel;
        switch (this.mapType) {
            case 'BMap':
                pixel = this.map.pointToPixel(new BMap.Point(lng, lat));
                break;
            case 'BMapGL':
                pixel = this.map.pointToPixel(new BMapGL.Point(lng, lat));
                break;
            default:
                console.log(`请输入正确的地图构造函数：['BMap','BMapGL']中的一种！`);
                break;
        }

        return pixel;
    }

    /**
    * 屏幕坐标转经纬度坐标
    * @param x 屏幕坐标x
    * @param y 屏幕坐标y
    */
    pixelToPoint(x, y) {
        let point;
        switch (this.mapType) {
            case 'BMap':
                point = this.map.pixelToPoint(new BMap.Pixel(x, y));
                break;
            case 'BMapGL':
                point = this.map.pixelToPoint(new BMapGL.Pixel(x, y));
                break;
            default:
                console.log(`请输入正确的地图构造函数：['BMap','BMapGL']中的一种！`);
                break;
        }

        return point;
    }

    /**
     * 创建marker
     * @param icon 图标
     * @param point 坐标点
     */
    createMarker(point) {
        let myIcon;
        let marker;
        switch (this.mapType) {
            case 'BMap':
                myIcon = new BMap.Icon(this.icon, new BMap.Size(this.iconSize.x, this.iconSize.y));
                marker = new BMap.Marker(point, {
                    icon: myIcon,
                });
                break;
            case 'BMapGL':
                myIcon = new BMapGL.Icon(this.icon, new BMapGL.Size(this.iconSize.x, this.iconSize.y));
                marker = new BMapGL.Marker(point, {
                    icon: myIcon,
                });
                break;
            default:
                console.log(`请输入正确的地图构造函数：['BMap','BMapGL']中的一种！`);
                break;
        }

        return marker;
    }

    /**
    * 析构函数
    */
    destory() {
        this.clearArrows();

        this.map.removeEventListener('moveend', this.moveendHandlerFunc);
        this.map.removeEventListener('zoomend', this.zoomendHandlerFunc);
    }
}

export default PolylineArrows;