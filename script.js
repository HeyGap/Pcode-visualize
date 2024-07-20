function debug(message) {
    $('#debug').html(message);
}

function debug_obj(obj) {
    $('#debug').html(JSON.stringify(obj));
}

function visualize(divname, MODEL) {
    var $$ = go.GraphObject.make;
    var diagram =
        $$(go.Diagram, divname,  // must name or refer to the DIV HTML element
            {
                initialContentAlignment: go.Spot.Center,
                // layout: $$(go.ForceDirectedLayout),
                layout: $$(go.LayeredDigraphLayout,  // 改为 LayeredDigraphLayout
                    {
                        direction: 90,  // 向下布局
                        layerSpacing: 30,  // 层间距
                        columnSpacing: 20  // 列间距
                    }),
                // moving and copying nodes also moves and copies their subtrees
                "commandHandler.copiesTree": true,  // for the copy command
                "commandHandler.deletesTree": true, // for the delete command
                "draggingTool.dragsTree": true,
                "diagram.maxSelectionCount": 1,
                "undoManager.isEnabled": false
            });

    var V = {};
    for (let i in MODEL.vertices) {
        var v = MODEL.vertices[i];
        V[v.node_id] = v;
        v.created = false;
    }

    var init_state = MODEL.vertices[0];

    function expandNode(node) {
        diagram.startTransaction("CollapseExpandTree");
        var data = node.data;
        if (!data.everExpanded) {
            diagram.model.setDataProperty(data, "everExpanded", true);
            var numchildren = createSubTree(data);
            if (numchildren === 0) {
                node.findObject('TREEBUTTON').visible = false;
            }
        }
        if (node.isTreeExpanded) {
            diagram.commandHandler.collapseTree(node);
        } else {
            diagram.commandHandler.expandTree(node);
        }
        diagram.commitTransaction("CollapseExpandTree");
    }

    function parseLink(linkdata) {
        // var st = linkdata.from;
        // var ed = linkdata.to;
        // var label = linkdata.label;

        // linkdata.content = "";

        // if (V[st].current != V[ed].current) {
        //     const c1 = V[st].contexts[V[st].current];
        //     const c2 = V[ed].contexts[V[ed].current];
        //     if (c2) {
        //         const pid = V[ed].current + 1001;
        //         if (!c1) {
        //             const p1 = V[st].current + 1001;
        //             label = `switch to ${pid} (${c2.name})`;
        //             linkdata.content = `${p1} exit`;
        //         } else {
        //             if (c1.heap != c2.heap) {
        //                 label = `switch to ${pid} (${c2.name})`;
        //             } else {
        //                 label = `switch to ${c2.name}`;
        //             }
        //         }
        //     }
        // } else if (label.match(/^t[0-9]+$/)) {
        //     label = V[st].contexts[V[st].current].name;
        // }
        // if (label == "write") {
        //     linkdata.content = V[ed].stdout.substring(V[st].stdout.length);
        // }
        // linkdata.label = label;
    }

    function addInitNode(model, nodedata) {
        const key = nodedata.key;
        V[key].created = true;
        nodedata.isGroup = true;
        ret = [nodedata];
        let code = "";
        for (let def of V[key].defs) {
            code += `${def.tid}\t\t${def.term}\n\n`;
        }
        for (let jmp of V[key].jmps) {
            code += `${jmp.tid}\t\t${jmp.term}\n\n`;
        }
        ret.push(
            { key: key, address: `addr = ${V[key].address}`, group: key, code: code, category: "blk" }
        );
        

        for(let n of ret) {
            model.addNodeData(n);
        }
    }

    function addNode(model, nodedata) {
        const key = nodedata.key;
        if (V[key].created) return;
        V[key].created = true;
        nodedata.isGroup = true;

        ret = [nodedata];
        let code = "";
        for (let def of V[key].defs) {
            code += `${def.id}\t\t${def.term}\n\n`;
        }
        for (let jmp of V[key].jmps) {
            code += `${jmp.id}\t\t${jmp.condition}\n\n`;
        }
        ret.push(
            { key: key, address: `addr = ${V[key].address}`, group: key, code: code, category: "blk" }
        );
        

        for(let n of ret) {
            model.addNodeData(n);
        }
    }
  

    function createSubTree(parentdata) {
        var model = diagram.model;
        var parent = diagram.findNodeForData(parentdata);
        var children = [];

        for (let i in MODEL.edges) {
            var st = MODEL.edges[i][0];
            var ed = MODEL.edges[i][1];
            var label = MODEL.edges[i][2];
            if (st == parentdata.key) {
                children.push({ key: st, ed: ed, label: label });
            }
        }

        for (var i = 0; i < children.length; i++) {
            var key = children[i].ed;
            var childdata = {
                key: key,
                parent: parentdata.key
            };
            addNode(model, childdata);

            var linkdata = {
                from: parentdata.key,
                to: children[i].ed,
                label: children[i].label
            };
            parseLink(linkdata);
            model.addLinkData(linkdata);

            // position the new child node close to the parent
            var child = diagram.findNodeForKey(key);
            child.location = parent.location;
        }

        return children.length
    }

    function expandAllNodes(node, visitedNodes = new Set()) {
        if (!node || visitedNodes.has(node.data.key)) return;  // Avoid processing already visited nodes
    
        visitedNodes.add(node.data.key);  // Mark this node as visited
    
        diagram.startTransaction("ExpandAllNodes");
        if (!node.data.everExpanded) {
            diagram.model.setDataProperty(node.data, "everExpanded", true);
            createSubTree(node.data);
        }
        diagram.commandHandler.expandTree(node);
        node.findTreeChildrenNodes().each(child => expandAllNodes(child, visitedNodes));
        diagram.commitTransaction("ExpandAllNodes");
    }
    
    const defaultNode = $$(go.Node, "Auto",
        $$(go.Shape, "Rectangle", { fill: "white", width: 100, height: 50 }),
        $$(go.TextBlock,
            {
                font: "12px Monospace",
                stroke: "white",
                margin: 2
            },
            new go.Binding("text", "text"))
    );

    const leftAlign = {
        alignment: go.Spot.TopLeft,
        defaultAlignment: go.Spot.Left,
        stretch: go.GraphObject.Horizontal,
    };

    const middleAlign = {
        alignment: go.Spot.Top,
        defaultAlignment: go.Spot.Top,
        stretch: go.GraphObject.Horizontal
    };

    const blkNode = $$(go.Node, "Auto",
        $$(go.Panel, "Vertical",
            $$(go.Panel, "Auto",
                middleAlign,
                $$(go.TextBlock,
                    {
                        font: "16px Monospace",
                        stroke: "black",
                        textAlign: "center",  // 文本居中
                        verticalAlignment: go.Spot.Center,  // 垂直居中
                        margin: new go.Margin(7, 0, 2, 0)
                    },
                    new go.Binding("text", "address")
                )
            ),
            
            // 矩形和代码TextBlock
            $$(go.Panel, "Auto",
                leftAlign,
                $$(go.Shape, "Rectangle", { fill: "white", stretch: go.GraphObject.Fill}),
                $$(go.Panel, "Auto",
                    $$(go.TextBlock,
                        {
                            font: "14px Monospace",
                            stroke: "black",
                            margin: new go.Margin(10, 10, 40, 10), // 设置上边距为0
                        },
                        new go.Binding("text", "code")
                    )
                )
            )
        )
    );

    const nodetmpl = new go.Map();
    nodetmpl.add('blk', blkNode);
    nodetmpl.add('', defaultNode);
    diagram.nodeTemplateMap = nodetmpl;

    diagram.groupTemplate =
        $$(go.Group, "Spot",
            {
                isTreeExpanded: false,
                layout: $$(go.LayeredDigraphLayout,
                    { direction: 0, columnSpacing: 5, layerSpacing: 5 }),
                isTreeLeaf: false
            },
            $$(go.Panel, "Auto",
                $$(go.Shape, "Rectangle",
                    {
                        parameter1: 10000,
                        fill: "#d3d3d3"
                    }),
                $$(go.Placeholder, { padding: 4 })
            ),
            $$("TreeExpanderButton",
                {
                    name: 'TREEBUTTON',
                    width: 12, height: 12,
                    alignment: go.Spot.TopRight,
                    alignmentFocus: go.Spot.Center,
                    click: (e, obj) => {  // OBJ is the Button
                        var node = obj.part;  // get the Node containing this Button
                        if (node === null) return;
                        e.handled = true;
                        expandNode(node);
                    }
                }
            )
        );

    const defaultLink = $$(go.Link, {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 5,
        toShortLength: 2
    },
        $$(go.Shape),
        $$(go.Shape, { toArrow: "Standard" }),
        $$(go.TextBlock, new go.Binding("text", "label"),
            {
                segmentOffset: new go.Point(0, -10),
                segmentOrientation: go.Link.OrientUpright
            }),
        $$(go.TextBlock,
            { font: "12px Monospace" },
            new go.Binding("text", "content"),
            {
                segmentOffset: new go.Point(0, 17),
                segmentOrientation: go.Link.OrientUpright
            })
    );

    const shortLink = $$(go.Link, {
        routing: go.Link.AvoidsNodes,  // Automatically route around nodes
        curve: go.Link.Bezier 
    }, $$(go.Shape));

    const templmap = new go.Map();
    templmap.add('short', shortLink);
    templmap.add('', defaultLink);
    diagram.linkTemplateMap = templmap;

    // create the model with a root node data
    initdata = {
        key: init_state.node_id,
        everExpanded: false
    };

    diagram.model = new go.GraphLinksModel([]);
    addInitNode(diagram.model, initdata);

    diagram.addDiagramListener("InitialLayoutCompleted", () => {
        expandAllNodes(diagram.findNodeForKey(init_state.node_id));
    });
}

visualize('diagramDivName',model);