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
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",

    "Echarts/lib/jquery-1.11.2",
    "Echarts/lib/echarts",
    "dojo/text!Echarts/widget/template/Echarts.html"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, _jQuery, echarts, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    // Declare widget's prototype.
    return declare("Echarts.widget.Echarts", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        svgGauge: null,
        gaugeArc: null,
        gaugeNeedle: null,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            // Uncomment the following line to enable debug messages
            //logger.level(logger.DEBUG);
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function() {
            logger.debug(this.id + ".postCreate");
            //this._updateRendering();
            this._setupEvents();
        },

        _processData : function () {

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
                            callback: dojoLang.hitch(this, this._datasetAdd, dataset)
                        });
                    } else {
                        this._datasetAdd(dataset, []);
                    }
                }

              })
            });
          }), this._mxObj);
        },

        _showChart: function() {
          logger.debug(this.id + "._showChart");

          // Load data again.
          this._loadData();

      		// based ready dom, initialization echarts instance
          var myChart = echarts.init(this.attachChart);

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
        }
    });
});

require(["Echarts/widget/Echarts"], function() {
    "use strict";
});
