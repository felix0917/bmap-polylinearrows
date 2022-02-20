import defaultValue from '../utils/defaultValue';

class PolylineArrows {
    constructor(mapType, map, data, icon, opts = {}) {
        this.mapType = mapType; // 地图类型，支持['BMap','BMapGL']
        this.map = map // 地图实例化对象
        this.data = data; // geojson格式的polyline数据
        this.icon = icon; // 箭头图标
        this.step = defaultValue(opts.step, 90); // 箭头间距
        this.iconSize = defaultValue(opts.iconSize, { x: 12, y: 12 }); // 箭头大小，单位px
        this.correctAngle = defaultValue(opts.correctAngle, 0); // 图标角度校正：图标的起始角度应该对准水平轴朝右（---->），单位：角度制

        // 私有变量
        this.lines = [];
        this.arrowOverlays = [];
        this.arrowGeojsonArr = [];
        this.moveendHandlerFunc = null;
        this.zoomendHandlerFunc = null;

        this.parseLineData();
        this.initRefreshEvent();
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
                this.lines = geo.coordinates;
                break;
            case 'MultiLineString':
                this.lines = geo.coordinates.flat();
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
        this.moveendHandlerFunc = this.moveendHandler.bind(this);
        this.zoomendHandlerFunc = this.zoomendHandler.bind(this);

        if (this.lines && this.lines.length > 1) {
            this.map.addEventListener('moveend', this.moveendHandlerFunc);
            this.map.addEventListener('zoomend', this.zoomendHandlerFunc);
        }
    }

    /**
     * 地图平移结束事件处理
     */
    moveendHandler() {
        this.dispatchArrows();
    }

    /**
     * 地图缩放结束事件处理
     */
    zoomendHandler() {
        this.dispatchArrows();
    }

    /**
    * 箭头绘制调度中心
    */
    dispatchArrows() {
        let that = this;
        
        // 每次更新前先清空所有箭头数据
        that.clearArrows();

        let step = that.step;
        let sylength = 0;
        let currrentLength = 0;
        let currentStart = that.pointToPixel(that.lines[0][0], that.lines[0][1]);
        let arrowNode = {};
        that.lines.map((val, index) => {
            if (index !== that.lines.length - 1) {
                let start = that.pointToPixel(val[0], val[1]);
                let end = that.pointToPixel(that.lines[index + 1][0], that.lines[index + 1][1]);
                let [dx, dy] = [end.x - start.x, start.y - end.y];
                if (dx !== 0 || dy !== 0) {
                    // 都为0意味着折线中节点太近，忽略这段距离
                    let rotation = Math.atan2(dy, dx);
                    let nodeDistance;
                    if (rotation === 0) {
                        nodeDistance = dx;
                    } else {
                        nodeDistance = dy / Math.sin(rotation);
                    }

                    if (Number(nodeDistance) < Number(step - currrentLength)) {
                        // 间距过短
                        currrentLength += nodeDistance;
                        currentStart = end;
                    } else {
                        if (currrentLength == 0) {
                            sylength = nodeDistance % step;
                            let splitNum = Math.floor(nodeDistance / step);
                            let Y = -Math.sin(rotation) * step;
                            let X = Math.cos(rotation) * step;
                            for (let i = 0; i < splitNum; i++) {
                                arrowNode.x = currentStart.x + X;
                                arrowNode.y = currentStart.y + Y;
                                currentStart = arrowNode;

                                that.addArrow(arrowNode, rotation);
                            }
                            currrentLength = sylength;
                            currentStart = end;
                        } else {
                            let littleStep = step - currrentLength;
                            let Y = -Math.sin(rotation) * littleStep;
                            let X = Math.cos(rotation) * littleStep;
                            arrowNode.x = currentStart.x + X;
                            arrowNode.y = currentStart.y + Y;
                            currentStart = arrowNode;

                            that.addArrow(arrowNode, rotation);

                            sylength = (nodeDistance - littleStep) % step;
                            let splitNum = Math.floor((nodeDistance - littleStep) / step);
                            Y = -Math.sin(rotation) * step;
                            X = Math.cos(rotation) * step;
                            for (let i = 0; i < splitNum; i++) {
                                arrowNode.x = currentStart.x + X;
                                arrowNode.y = currentStart.y + Y;
                                currentStart = arrowNode;

                                that.addArrow(arrowNode, rotation);
                            }
                            currrentLength = sylength;
                            currentStart = end;
                        }
                    }
                }
            }
        });
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