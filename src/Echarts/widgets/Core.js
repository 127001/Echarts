/*global logger, Snap, html, domStyle */
/*
    Echarts
    ========================

    @file      : Echarts.js
    @version   : 1.0.0
    @author    : Rob Duits
    @date      : 1/28/2016
    @copyright : Incentro 2016
    @license   : Apache 2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/query",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/_base/window",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/ready",
    "dojo/_base/event",

    "Echarts/lib/jquery-1.11.2",
    "Echarts/lib/echarts",
    "dojo/text!Echarts/templates/Echarts.html"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, domQuery, dojoProp, dojoGeometry, dojoClass, domAttr, dojoStyle, win, domConstruct, dojoArray, dojoLang, dojoText, dojoHtml, ready, dojoEvent, _jQuery, _echarts, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    // Declare widget's prototype.
    return declare([_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _chartJS: null,
        _chart: null,
        _ctx: null,
        _dataset: null,
        _datasetCounter: 0,
        _data: null,
        _chartData: null,
        _activeDatasets: null,
        _legendNode: null,
        _mxObj: null,
        _handle: null,

        _resizeTimer: null,

        _currentContext: null,
        _addedToBody: false,

        startup: function () {
            // Uncomment line to start debugging
            logger.level(logger.DEBUG);
            logger.debug(this.id + ".startup");

            var domNode = null;

            // based ready dom, initialization echarts instance
            var myChart = _echarts.init(this.attachChart);

            // Fonts
            this._font = this.labelFont || "Helvetica Neue";

            // Set object , dataset and datapoint.
            //this._dataset = this.datasetentity.split("/")[0];
            //this._datapoint = this.datapointentity && this.datapointentity.split("/")[0];
            this._data = {};
            this._documentReady = false;

            this._chartData = {
                contextObj: null,
                datasets: []
            };

            this._activeDatasets = [];

            this.connect(this.mxform, "resize", dojoLang.hitch(this, function () {
                this._resize();
            }));

        },

        datasetAdd: function (dataset, datapoints) {
            logger.debug(this.id + ".datasetAdd");
            var set = {
                dataset: dataset,
                sorting: +(dataset.get(this.datasetsorting))
            };
            if (datapoints.length === 1) {
                set.point = datapoints[0];
                set.points = datapoints;
            } else {
                set.points = datapoints;
            }

            this._data.datasets.push(set);

            this._datasetCounter--;
            if (this._datasetCounter === 0) {
                this._processData();
            }
        },

        update: function (obj, callback) {
            logger.debug(this.id + ".update");
            this._mxObj = obj;

            if (this._handle !== null) {
                mx.data.unsubscribe(this._handle);
            }
            this._handle = mx.data.subscribe({
                guid: this._mxObj.getGuid(),
                callback: dojoLang.hitch(this, this._loadData)
            });

            // Load data again.
            this._loadData();

            if (typeof callback !== "undefined") {
                callback();
            }
        },

        _loadData: function () {
            logger.debug(this.id + "._loadData");
            this._data = {
                object: this._mxObj,
                datasets: []
            };

            this._executeMicroflow(this.datasourcemf, dojoLang.hitch(this, function (objs) {
                var obj = objs[0], // Chart object is always only one.
                    j = null,
                    dataset = null,
                    pointguids = null;

                this._data.object = obj;
                this._data.datasets = [];

                // Retrieve datasets
                mx.data.get({
                    guids: obj.get(this._dataset),
                    callback: dojoLang.hitch(this, function (datasets) {
                        var set = {};

                        this._datasetCounter = datasets.length;
                        this._data.datasets = [];

                        for (j = 0; j < datasets.length; j++) {
                            dataset = datasets[j];
                            pointguids = dataset.get(this._datapoint);
                            if (typeof pointguids === "string" && pointguids !== "") {
                                pointguids = [pointguids];
                            }
                            if (typeof pointguids !== "string") {
                                mx.data.get({
                                    guids: pointguids,
                                    callback: dojoLang.hitch(this, this.datasetAdd, dataset)
                                });
                            } else {
                                this.datasetAdd(dataset, []);
                            }
                        }

                    })
                });
            }), this._mxObj);

        },

        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
            if (this._handle !== null) {
                mx.data.unsubscribe(this._handle);
            }
        },

        _processData: function () {
            // STUB
            console.error("_processData: This is placeholder function that should be overwritten by the implementing widget.");
        },

        _createChart: function (data) {
            // STUB
            console.error("_createChart: This is placeholder function that should be overwritten by the implementing widget.", data);
        },

        _onClickChart: function () {
            logger.debug(this.id + "._onClickChart");
            if (this.onclickmf) {
                this._executeMicroflow(this.onclickmf);
            }
        },

        _createLegend: function (isSingleSeries) {
            logger.debug(this.id + "._createLegend");
            var listNodes = null,
                k = null;

            if (this.showLegendCustom) {
                this._legendNode.innerHTML = this._chart.generateLegend();

                listNodes = domQuery("li", this._legendNode);

                if (listNodes.length > 0) {
                    for (k = 0; k < listNodes.length; k++) {
                        this.connect(listNodes[k], "click", dojoLang.hitch(this, this._onClickLegend, k, isSingleSeries));
                    }
                }
            }
        },

        _legendCallback: function (chart) {
            logger.debug(this.id + "._legendCallback");
            var text = [];
            text.push("<ul class=\"" + chart.id + "-legend chart-legend\">");
            for (var i = 0; i < chart.data.datasets.length; i++) {
                text.push("<li class=\"chart-legend_item\"><span class=\"chart-legend_bullet\" style=\"background-color:" + chart.data.datasets[i].backgroundColor + "\"></span>");
                if (chart.data.datasets[i].label) {
                    text.push(chart.data.datasets[i].label);
                }
                text.push("</li>");
            }
            text.push("</ul>");

            return text.join("");
        },

        _legendAlternateCallback: function(chart) {
            var text = [];
            text.push("<ul class=\"" + chart.id + "-legend chart-legend\">");

            if (chart.data.datasets.length) {
                for (var i = 0; i < chart.data.datasets[0].data.length; ++i) {
                    text.push("<li class=\"chart-legend_item\"><span class=\"chart-legend_bullet\" style=\"background-color:" + chart.data.datasets[0].backgroundColor[i] + "\"></span>");
                    if (chart.data.labels[i]) {
                        text.push(chart.data.labels[i]);
                    }
                    text.push("</li>");
                }
            }

            text.push("</ul>");
            return text.join("");
        },

        _onClickLegend: function (idx, isSingleSeries) {
            logger.debug(this.id + "._onClickLegend", idx, isSingleSeries);
            var activeSet = null,
                activeSetLegend = null,
                newDatasets = {
                    datasets: [],
                    labels: this._chartData.labels
                },
                i = null;

            this._activeDatasets[idx].active = !this._activeDatasets[idx].active;

            this._chart.destroy();
            for (i = 0; i < this._activeDatasets.length; i++) {
                activeSet = this._activeDatasets[i];
                activeSetLegend = domQuery("li", this._legendNode)[activeSet.idx];

                if (activeSet.active) {
                    if (dojoClass.contains(activeSetLegend, "legend-inactive")) {
                        dojoClass.remove(activeSetLegend, "legend-inactive");
                    }

                    newDatasets.datasets.push(activeSet.dataset);
                } else if (!dojoClass.contains(activeSetLegend, "legend-inactive")) {
                    dojoClass.add(activeSetLegend, "legend-inactive");
                }
            }
            if (isSingleSeries) {
                this._createChart(newDatasets.datasets);
            } else {
                this._createChart(newDatasets);
            }
        },

        _createDataSets: function (data) {
            logger.debug(this.id + "._createDataSets", data);
            var _chartData = {
                labels: [],
                datasets: [
                    {
                        data: [],
                        backgroundColor: [],
                        hoverBackgroundColor: []
                    }
                ]
            };

            for (var j = 0; j < data.length; j++) {
                _chartData.labels.push(data[j].label);
                _chartData.datasets[0].data.push(data[j].value);
                _chartData.datasets[0].backgroundColor.push(data[j].backgroundColor);
                _chartData.datasets[0].hoverBackgroundColor.push(data[j].hoverBackgroundColor);
            }

            return _chartData;
        },

        _sortArrayObj: function (values) {
            logger.debug(this.id + "._sortArrayObj");
            return values.sort(dojoLang.hitch(this, function (a, b) {
                var aa = +(a.sorting),
                    bb = +(b.sorting);
                if (aa > bb) {
                    return 1;
                }
                if (aa < bb) {
                    return -1;
                }
                // a must be equal to b
                return 0;
            }));
        },

        // _isNumber: function (n, attr) {
        //     // Fix for older MX versions who do not have the .isNumeric method
        //     if (typeof n.isNumeric === "function") {
        //         return n.isNumeric(attr);
        //     }
        //     return n.isNumber(attr);
        // },

        // _sortArrayMx: function (values, sortAttr) {
        //     logger.debug(this.id + "._sortArrayMx");
        //     return values.sort(dojoLang.hitch(this, function (a, b) {
        //         var aa = +(a.get(sortAttr)),
        //             bb = +(b.get(sortAttr));
        //         //if the attribute is numeric
        //         aa = this._isNumber(a, sortAttr) ? parseFloat(aa) : aa;
        //         bb = this._isNumber(b, sortAttr) ? parseFloat(bb) : bb;
        //         if (aa > bb) {
        //             return 1;
        //         }
        //         if (aa < bb) {
        //             return -1;
        //         }
        //         // a must be equal to b
        //         return 0;
        //     }));
        // },

        _addChartClass: function (className) {
            logger.debug(this.id + "._addChartClass");
            dojoClass.remove(this.domNode, className);
            dojoClass.add(this.domNode, className);
        },

        _resize: function () {
            logger.debug(this.id + "._resize");
            var position = dojoGeometry.position(this.domNode.parentElement, false);

            clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(dojoLang.hitch(this, function (){
                //Only resize when chart is set to responsive and width and height of parent element > 0
                if (this._chart && this.responsive && position.w > 0 && position.h > 0) {
                    this._chart.resize();
                }
            }), 50);
        },

        _hexToRgb: function (hex, alpha) {
            logger.debug(this.id + "._hexToRgb", hex, alpha);
            if (hex !== null) {
                var regex = null,
                    shorthandRegex = null,
                    result = null;

                // From Stackoverflow here: http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
                // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
                shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
                hex = hex.replace(shorthandRegex, function (m, r, g, b) {
                    return r + r + g + g + b + b;
                });

                regex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                if (regex) {
                    result = {
                        r: parseInt(regex[1], 16),
                        g: parseInt(regex[2], 16),
                        b: parseInt(regex[3], 16)
                    };
                    return "rgba(" + result.r + "," + result.g + "," + result.b + "," + alpha + ")";
                }
            } else {
                logger.warn("Empty hex color!");
            }
            return "rgba(220,220,220," + alpha + ")";
        },

        _executeMicroflow: function (mf, callback, obj) {
            logger.debug(this.id + "._executeMicroflow");
            var _params = {
                applyto: "selection",
                actionname: mf,
                guids: []
            };

            if (obj === null) {
                obj = this._data.object;
            }

            if (obj && obj.getGuid()) {
                _params.guids = [obj.getGuid()];
            }

            mx.data.action({
                params: _params,
                store: {
                    caller: this.mxform
                },
                callback: dojoLang.hitch(this, function (obj) {
                    if (typeof callback !== "undefined") {
                        callback(obj);
                    }
                }),
                error: function (error) {
                    console.log(error.description);
                }
            }, this);
        },


/* ----------------------------------------------------------------------------------
        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            // Uncomment the following line to enable debug messages
            logger.level(logger.DEBUG);
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function() {
            logger.debug(this.id + ".postCreate");
            //this._updateRendering();
            this._setupEvents();
        },

        _createDataSets: function (data) {
            logger.debug(this.id + "._createDataSets", data);
            var _chartData = {
                labels: [],
                datasets: [
                    {
                        data: [],
                        backgroundColor: [],
                        hoverBackgroundColor: []
                    }
                ]
            };

            for (var j = 0; j < data.length; j++) {
                _chartData.labels.push(data[j].label);
                _chartData.datasets[0].data.push(data[j].value);
                _chartData.datasets[0].backgroundColor.push(data[j].backgroundColor);
                _chartData.datasets[0].hoverBackgroundColor.push(data[j].hoverBackgroundColor);
            }

            return _chartData;
        },

        _processData: function () {
          var sets = [],
              set = {
                  points : []
              },
              Progression = [],
              id = "",
              ColorPrimary = "";

              this._chartData.datasets = [];
              this._chartData.labels = [];
              sets = this._data.datasets = this._sortArrayObj(this._data.datasets);
              console.log(sets);
        },

        _datasetAdd: function (dataset, datapoints) {
            logger.debug(this.id + "._datasetAdd");
            var set = {
                dataset: dataset,
                sorting: +(dataset.get(this.datasetsorting))
            };
            if (datapoints.length === 1) {
                set.point = datapoints[0];
                set.points = datapoints;
            } else {
                set.points = datapoints;
            }

            this._data.datasets.push(set);

            this._datasetCounter--;
            if (this._datasetCounter === 0) {
                this._processData();
            }
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering();

            // Load data again.
            this._loadData();

            if (typeof callback !== "undefined") {
              callback();
            }
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function() {
          logger.debug(this.id + ".enable");
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function() {
          logger.debug(this.id + ".disable");
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function(box) {
          logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function() {
          logger.debug(this.id + ".uninitialize");
          // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // Attach events to HTML dom elements
        _setupEvents: function() {
            logger.debug(this.id + "._setupEvents");
        },

        _loadData: function () {
          logger.debug(this.id + "._loadData");
          this._data = {
              object: this._contextObj,
              datasets: []
          };

          this._executeMicroflow(this.datasourcemf, dojoLang.hitch(this, function (objs) {
            var obj = objs[0], // Chart object is always only one.
              j = null,
              dataset = null,
              pointguids = null;

            this._data.object = obj;
            this._data.datasets = [];

            // Retrieve datasets
            mx.data.get({
              guids: obj.get(this._dataset),
              callback: dojoLang.hitch(this, function (datasets) {
                var set = {};

                this._datasetCounter = datasets.length;
                this._data.datasets = [];
                for (j = 0; j < datasets.length; j++) {
                    dataset = datasets[j];
                    pointguids = dataset.get(this._datapoint);
                    if (typeof pointguids === "string" && pointguids !== "") {
                        pointguids = [pointguids];
                    }
                    if (typeof pointguids !== "string") {
                        mx.data.get({
                            guids: pointguids,
                            callback: dojoLang.hitch(this, this._datasetAdd, dataset)
                        });
                    } else {
                        this._datasetAdd(dataset, []);
                    }
                }

              })
            });
          }), this._contextObj);
        },

        // Rerender the interface.
        _updateRendering: function() {
            logger.debug(this.id + "._updateRendering");

            // Draw or reload.
            if (this._contextObj !== null) {
              this._showChart();
            } else {
                // Hide widget dom node.
                dojoStyle.set(this.domNode, "display", "none");
            }

            // Important to clear all validations!
            this._clearValidations();
        },

        // Handle validations.
        _handleValidation: function (_validations) {
            this._clearValidations();

            var _validation = _validations[0],
                _message = _validation.getReasonByAttribute(this.jsonDataSource);

            if (this.readOnly) {
                _validation.removeAttribute(this.jsonDataSource);
            } else {
                if (_message) {
                    this._addValidation(_message);
                    _validation.removeAttribute(this.jsonDataSource);
                }
            }
        },

        // Clear validations.
        _clearValidations: function () {
            dojoConstruct.destroy(this._alertdiv);
            this._alertdiv = null;
        },

        // Show an error message.
        _showError: function (message) {
            console.log("[" + this.id + "] ERROR " + message);
            if (this._alertDiv !== null) {
                html.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            dojoConstruct.place(this.domNode, this._alertdiv);
        },

        // Add a validation.
        _addValidation: function (message) {
            this._showError(message);
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");

            var _objectHandle = null,
                _attrHandle = null,
                _validationHandle = null;

            // Release handles on previous object, if any.
            if (this._handles) {
                dojoArray.forEach(this._handles, function (handle, i) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                _objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                _attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.jsonDataSource,
                    callback: dojoLang.hitch(this, function (guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });

                _validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });

                this._handles = [_objectHandle, _attrHandle, _validationHandle];
            }
        },

        _executeMicroflow: function (mf, callback, obj) {
            logger.debug(this.id + "._executeMicroflow");
            var _params = {
                applyto: "selection",
                actionname: mf,
                guids: []
            };

            if (obj === null) {
                obj = this._data.object;
            }

            if (obj && obj.getGuid()) {
                _params.guids = [obj.getGuid()];
            }

            mx.data.action({
                params: _params,
                store: {
                    caller: this.mxform
                },
                callback: dojoLang.hitch(this, function (obj) {
                    if (typeof callback !== "undefined") {
                        callback(obj);
                    }
                }),
                error: function (error) {
                    console.log(error.description);
                }
            }, this);
        },
---------------- */
        _showChart: function() {
          logger.debug(this.id + "._showChart");

      		// based ready dom, initialization echarts instance
          var myChart = _echarts.init(this.attachChart);

      		// Specify configurations and data graphs
      		var option = {
      	    title: {
      	      text: this.titleAttr,
      				left: "center"
      	    },
      			tooltip: {
      	      trigger: "item",
      	      formatter: "{a} <br/>{b} : {c}"
      	    },
      	    xAxis: {
      	      data: ["20-01","24-01","26-01","23-04","20-05","20-06"],
      				splitLine: {show: false}
      	    },
      	    yAxis: {
      				min: this.yAxisMinValueAttr,
      				max: this.yAxisMaxValueAttr,
      				splitLine: {show: false}
      			},
      			dataZoom: {
      		    type: "inside",
      				startValue: 0,
      		    start: 0,
      		    end: 100
      	    },
      	    series: [{
      	      name: "independent",
      	      type: "line",
      	      data: [0, 20, 36, 10, 10, 20],
      	      animationDuration: 1000,
      				smooth: true
      	    }]
      		};

          // Just use the specified configurations and data graphs.
          myChart.setOption(option);
        }
    });
});
