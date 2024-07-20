with open('1test.json','r') as file:
    with open('./WWW/model.js','w') as jsfile:
        jsfile.write('const model = {\n')
        CFG_flag = 0
        left_braces = 0
        vertices = ["vertices",[]]
        line_count = -1
        lines = file.readlines()
        for i in range(len(lines)):
            line_count += 1
            if line_count >= len(lines):
                break
            if CFG_flag == 0:
                if 'CFG' in lines[line_count]:
                    CFG_flag = 1
            else:
                # 处理边的第一步
                if 'edges' in lines[line_count]:
                    edges = lines[line_count].split(": ")[1].split(",\n")[0]
                    edges = edges.strip('()')
                    edges = edges.split('), (')
                    edges = [pair.split(', ') for pair in edges]
                    # print(edges)

                # 处理节点
                elif 'node weights' in lines[line_count]:
                    left_braces += 1
                    continue

                if 'edge weights' in lines[line_count]:
                    for i in range(line_count,len(lines)):
                        if 'Block' in lines[i] or 'Jump' in lines[i] or 'CallCombine' in lines[i] or 'Call(' in lines[i] or 'ReturnCombine' in lines[i] or 'ExternCallStub' in lines[i] or 'CrCallStub' in lines[i] or 'CrReturnStub' in lines[i]:
                            line = int(lines[i].split(": ")[0].strip())
                            edges[line].append(lines[i].split(": ")[1].split("\n")[0])
                    break

                if left_braces == 1: # 012345...: Node
                    # 加一个node
                    if '}' in lines[line_count]:
                        continue
                    vertices[1].append([])
                    jmps_flag = False
                    node_id = lines[line_count].split(": ")[0].strip()
                    print("nodeq_id",node_id)
                    # node的id
                    vertices[1][int(node_id)].append(["node_id",node_id])
                    # print(vertices)
                    left_braces += 1

                elif left_braces == 2: # block_tid/term
                    if '{' in lines[line_count]:
                        left_braces += 1

                elif left_braces == 3: # 
                    if 'address' in lines[line_count]:
                        address = lines[line_count].split(": \"")[1].split("\",\n")[0]
                        vertices[1][int(node_id)].append(["address","0x"+address])
                        # print(vertices)
                    if 'defs' in lines[line_count]:
                        defs_count = 0
                        vertices[1][int(node_id)].append(["defs",[]])
                    elif 'jmps' in lines[line_count]:
                        jmps_flag = True
                        defs_count = 0
                        vertices[1][int(node_id)].append(["jmps",[]])
                    elif 'Term' in lines[line_count]:
                        # print("Term caution",line_count)
                        left_braces += 1

                elif left_braces == 4: # Term
                    if 'tid' in lines[line_count]:
                        left_braces += 1
                    if 'term' in lines[line_count]:
                        if 'Branch(' in lines[line_count] or 'Return(' in lines[line_count] or 'BranchInd(' in lines[line_count]:continue
                        opcode = lines[line_count].split(": ")[1].split("{")[0]
                        term = opcode
                        name_flag = 0
                        for i in range(line_count,len(lines)):
                            if 'Branch(' in lines[i] or 'Return(' in lines[i]:continue
                            if '{' in lines[i]:
                                left_braces += 1
                            elif '}' in lines[i]:
                                left_braces -= 1
                                if left_braces == 3:
                                    if name_flag == 1:
                                        term += ')'
                                    if not jmps_flag:
                                        vertices[1][int(node_id)][2][1][defs_count].append(["term",term])
                                    else:
                                        vertices[1][int(node_id)][3][1][defs_count].append(["term",term])
                                    defs_count  += 1
                                    left_braces += 1
                                    line_count   = i
                                    # print("caution",line_count)
                                    break
                            if opcode == 'Assign ' or opcode == 'BinOp ' or opcode == 'UnOp ' or opcode == 'Load 'or opcode == 'Store ':
                                if 'name' in lines[i]:
                                    if name_flag == 0:
                                        term += lines[i].split(": \"")[1].split("\",")[0] + ','
                                    if name_flag == 1:
                                        term += "(lhs " + op + ' rhs'
                                if 'op' in lines[i]:
                                    name_flag = 1
                                    op = lines[i].split(": ")[1].split(",\n")[0]
                            elif opcode == 'CBranch ':
                                if 'address' in lines[i]:
                                    term += "0x" + lines[i].split(": \"")[1].split("\",\n")[0] + ',('
                                if 'name' in lines[i]:
                                    if name_flag == 0:
                                        term += lines[i].split(": \"")[1].split("\",")[0] + ','
                                    if name_flag == 1:
                                        term += "(" + lines[i].split(": \"")[1].split("\",")[0] + ' ' + op + ' '
                                        name_flag = 0
                                if 'op' in lines[i]:
                                    name_flag = 1
                                    op = lines[i].split(": ")[1].split(",\n")[0]
                                if 'Const' in lines[i]:
                                    term += lines[i+7].strip().strip(',')

                elif left_braces == 5: # Tid
                    if 'id' in lines[line_count]:
                        tid = lines[line_count].split(": \"")[1].split("\",\n")[0]
                        if not jmps_flag:
                            vertices[1][int(node_id)][2][1].append([])
                            vertices[1][int(node_id)][2][1][defs_count].append(["tid",tid])
                        else:
                            vertices[1][int(node_id)][3][1].append([])
                            vertices[1][int(node_id)][3][1][defs_count].append(["tid",tid])
                        # print(vertices)
                    

                if '}' in lines[line_count]:
                    left_braces -= 1
                    if left_braces == 0:
                        # print(vertices)
                        break

                
        # print(edges)
        print(vertices)
        jsfile.write("\t\"vertices\": [\n")
        for node in vertices[1]:
            jsfile.write("\t\t{\n")
            jsfile.write("\t\t\t\"node_id\": \""+node[0][1]+"\",\n")
            jsfile.write("\t\t\t\"address\": \""+node[1][1]+"\",\n")
            jsfile.write("\t\t\t\"defs\": [\n")
            for Def in node[2][1]:
                jsfile.write("\t\t\t\t{\n")
                for def_ in Def:
                    jsfile.write("\t\t\t\t\t\""+def_[0]+"\": \""+def_[1]+"\",\n")
                jsfile.write("\t\t\t\t},\n")
            jsfile.write("\t\t\t],\n")
            jsfile.write("\t\t\t\"jmps\": [\n")
            for Jmp in node[3][1]:
                jsfile.write("\t\t\t\t{\n")
                for jmp in Jmp:
                    jsfile.write("\t\t\t\t\t\""+jmp[0]+"\": \""+jmp[1]+"\",\n")
                jsfile.write("\t\t\t\t},\n")
            jsfile.write("\t\t\t]\n")
            jsfile.write("\t\t},\n")
        jsfile.write("\t],\n")
        

        jsfile.write("\t\"edges\": [\n")
        for edge in edges:
            jsfile.write("\t\t[\n")
            jsfile.write("\t\t\t\""+edge[0]+"\",\n")
            jsfile.write("\t\t\t\""+edge[1]+"\",\n")
            jsfile.write("\t\t\t\""+edge[2].strip('(').strip(',')+"\"\n")
            jsfile.write("\t\t],\n")
        jsfile.write("\t]\n")
        jsfile.write("}\n")
