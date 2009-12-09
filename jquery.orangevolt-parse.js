/* 
 * Copyright (c) 2009 Lars Gersmann (lars.gersmann@gmail.com, http://orangevolt.blogspot.com)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 */
;(jQuery.orangevolt && jQuery.orangevolt.parse) || (function($) {
	$.orangevolt = $.orangevolt || {};
	$.orangevolt.parse = $.orangevolt.parse || {};
	
	$.orangevolt.parse.Reader = function( input) {
		if( this instanceof $.orangevolt.parse.Reader) {
			var line_breaks = [];
			var offset = 0;
			
				// track line/column
			var track = function( string) {
				for( var i=0; i<string.length; i++) {
					offset++;
					
					if( string[i]=='\n' || (string[i]=='\r' && string.length>i+1 && string[i+1]!='\n')) {
						line_breaks.push( { offset : offset, column : this.column});
						this.line++;
						this.column=1;
					} else {
						this.column++;
					}
				} 

				this.charsLeft = this.charsLeft.substring( string.length);
			}; 	

				// untrack line/column
			var untrack = function( arg) {
				var string = $.isArray( arg) ? arg[0].toString() : arg;

				for( var i=string.length-1; i>=0; i--) {
					offset--;
					if( line_breaks.length>0 && line_breaks[ line_breaks.length-1].offset==offset+1) {
						this.line--;
						this.column=line_breaks.pop().column; 
					} else {
						this.column--;
					}
				} 
				
				this.charsLeft = string + this.charsLeft;
			};
			
			$.extend( this, {
				charsLeft : input,				 
				line      : 1,
				column    : 1,
				next : function( regexp) {
					var index = this.charsLeft.search( regexp);
					if( index==0) {
						var match = this.charsLeft.match( regexp);
						track.call( this, match[0]);						
						
						return match;
					}
					return undefined;
				},
				unread : function( /*array<string> || string*/arg) {
					untrack.call( this, arg);

					return this;
				}
			});
			
			return this;
		} else {
			return new $.orangevolt.parse.Reader( input);
		}
	};

	$.orangevolt.parse.Match = function( skipped, match, regexp, token, position) {
		if( this instanceof $.orangevolt.parse.Match) {
			this.skipped  = skipped;
			this.match    = match;
			this.regexp    = regexp;
			this.token 	  = token; 
			this.position = position;
			$.extend( this, {
				toString : function() {
					return match[0]; 
				} 
			});
			
			return this;
		}
		else return new $.orangevolt.parse.Match( skipped, match, regexp, token, position);
	};

	$.orangevolt.parse.LexerException = function( msg) {
		if( this instanceof $.orangevolt.parse.LexerException) {
			this.toString = function() {
				return msg;
			};
		} else {
			return new $.orangevolt.parse.LexerException( msg);
		}
	};
	
	$.orangevolt.parse.Lexer = function( options) {
		if( this instanceof $.orangevolt.parse.Lexer) {
			var tokens = options.tokens;
			delete options.tokens;
			
				// create regexp over all tokens
			var tokenRegexp = ""; 
			var tokenNames = [];
			for( var token in tokens) {
				if( tokens.hasOwnProperty( token)) {
					tokenNames.push( token);
					var regexp = tokens[ token].source;
					tokenRegexp = tokenRegexp + '|(' + regexp.replace(
							/\\?\(/g,function( txt) { return txt.charAt(0)=='\\' ? txt : txt + '?:';}
						) + ')';
				}
			}
			tokenRegexp = new RegExp( tokenRegexp.substring( 1), 'm');
				// --
						
			$.extend( this, $.orangevolt.parse.Lexer, options, {
				tokens : tokens,
				next : function( reader, /**string||regexp||undefined*/token) {
					if( typeof token == 'string') {
						token = this.tokens[ token];
					}
				
					var skipped = reader.next( this.skip) || [''];
					var position = { line : reader.line, column : reader.column};
					
					var match = reader.next( token || tokenRegexp);					
					if( match!==undefined) {
						if( typeof token == 'undefined') {
							for( var i=1; i<match.length; i++) {
								if( match[i]!==undefined) {
									token = this.tokens[ tokenNames[i-1]];
									break;
								}
							} 
						}
						
						return $.orangevolt.parse.Match( skipped, match, token, this.getTokenName( token), position);
					} else {
						if( reader.charsLeft.length) {
							reader.unread( skipped);
							// return undefined;
							
							throw $.orangevolt.parse.LexerException( 'lexer : no token matched input "' + reader.charsLeft + '"');
						} else {
							return $.orangevolt.parse.Match( skipped, [''], /$/, $.orangevolt.parse.Lexer.EOF, position);
						}
					}
				},
				unread : function( reader, match) {
					reader.unread( match.match);
					reader.unread( match.skipped);					
				},
				getTokenName : function( regexp) {
					for( var p in this.tokens) {
						if( this.tokens[p]===regexp) {
							return p;
						}
					}
				}
			});
			
			return this;
		}
		else return new $.orangevolt.parse.Lexer( options);
	};
	
	$.extend( $.orangevolt.parse.Lexer, {
		EOF  : /$/
	});
	
	$.orangevolt.parse.Grammar = function( options) {
		if( this instanceof $.orangevolt.parse.Grammar) {
			if( !(options.lexer instanceof $.orangevolt.parse.Lexer)) {
				options.lexer = $.orangevolt.parse.Lexer( options.lexer); 
			}

			options.rules = $.makeArray( options.rules); 
			for( var i=0; i<options.rules.length; i++) { 
				options.rules[i] = options.rules[i].getFirstSibling();
			}
			
			$.extend( this, options, {
				parse 		: /**parser*/function( /**string*/input) {
					var reader = $.orangevolt.parse.Reader( input);
					
					return $.orangevolt.parse.Parser( { grammar : this, reader : reader}).parse();
				}
			});
			
			return this;
		}
		else return new $.orangevolt.parse.Grammar( options);
	};

	$.orangevolt.parse.Error = function( options) {
		if( this instanceof $.orangevolt.parse.Error) {
			return $.extend( this, options, {
				toString : function() {
					if( this.child) {
						return this.child.toString(); 
					} else {
						return (this.position ? this.position.line + ',' + this.position.column + ' : ' : '') + this.msg;
					}
				},
				getStackTrace : function() {
					if( this.child) {
						var stackTrace = this.child.getStackTrace();
						stackTrace.push( this);
						return stackTrace; 
					} else {
						return [ this];
					}
				} 
			});
		}
		else return new $.orangevolt.parse.Error( options);
	};
	
	$.orangevolt.parse.Parser = function( options) {
		if( this instanceof $.orangevolt.parse.Parser) {
			var next = undefined;
			
			$.extend( this, $.orangevolt.parse.Parser, options, {
				next 		: function() {
					if( !next) {
							// update position
						this.position = { line : this.reader.line, column : this.reader.column };
						
						next = this.grammar.lexer.next( this.reader);
					}
					
					return next;
				},
				consume		: function() {
					next = undefined;
						// update position
					this.position.line = { line : this.reader.line, column : this.reader.column};
				},
				parse 		: function() {
					var rule=this.grammar.rules[0], ast;
					
					do {
						ast = rule.adapt( this, ast);
						if( ast instanceof $.orangevolt.parse.Error) {
							throw ast;
						}
					}
					while( rule=rule.nextSibling);
					
						// rollback potentially read token (-> out of next)  
					this.rollback();
					
					ast = ast.getFirstSibling();
					
						// cleanup unneeded ast nodes from Term rule
					return( function (ast) {
						for( var i=0; i<ast.children.length; i++) {
							ast.children[i] = arguments.callee( ast.children[ i]).getFirstSibling();
						}
						
						if( ast.nextSibling) {
							ast.nextSibling = arguments.callee( ast.nextSibling);
							if( ast.nextSibling) {
								ast.nextSibling.prevSibling = ast; 
							}
						}	
						
						if( ast.rule.type=='Term') {
							var child = ast.children[0];
							if( ast.prevSibling) {
								child.prevSibling = ast.prevSibling;
								child.prevSibling.nextSibling=child;
							}

							child = child.getLastSibling();
							if( ast.nextSibling) {
								child.nextSibling = ast.nextSibling;
								child.nextSibling.prevSibling=child;
							}
							
							ast = child;
						}
						return ast;
					})(ast);
				},
				rollback 	: function( ast) {
					if( next) {
							// unread cached next token
						this.grammar.lexer.unread( this.reader, next);
						next=undefined;
					}
					
					if( ast) {
						ast = ast.getLastSibling();
						do {
							var i=ast.children.length;
							while( i-->0) {
								this.rollback( ast.children[i]);
							}
							
							this.grammar.lexer.unread( this.reader, ast.match);
						}
						while( ast=ast.prevSibling);
					}
					
						// update position 
					this.position = { line : this.reader.line, column : this.reader.column};
				},
				error : function( options) {
					return $.orangevolt.parse.Error( $.extend( options, { 
						position : this.position 
					}));
				},
				position : { 
					line : 1,
					column : 1
				}
			});
			
			return this;
		}
		else return new $.orangevolt.parse.Parser( options);
	};	
	
		// Node is a mixin ! 
	$.orangevolt.parse.Node = {
		getFirstSibling : function() {
			var node = this;
			do {
				if( !node.prevSibling) {
					break;
				}
			} while( node=node.prevSibling);
			
			return node;
		},
		getChainLength : function() {
			var node = this.getFirstSibling();
			
			var count = 1;
			while( node=node.nextSibling) {
				count++;
			}
			
			return count;
		},
		getLastSibling : function() {
			var node = this;
			while( node.nextSibling) {
				node = node.nextSibling;
			}
			return node;
		}
	};
	
	$.orangevolt.parse.AST = function( rule, match, /**AST*/prevSibling, /**array<AST>*/children) {
		if( this instanceof $.orangevolt.parse.AST) {
			if( prevSibling) {
				prevSibling.nextSibling = this;
			}
			
			$.extend( this, $.orangevolt.parse.Node, {
				rule 		: rule,
				match 		: match,
				prevSibling : prevSibling,
				children 	: children,
				toString    : function() {
					return this.rule.type + ' ' + this.rule.token + '(' + this.match.match[0] + ')';
				},
				html		: function() {
					var html = $('<div/>');
					var ast = this;
					while( ast) {
						var label = $( '<div style="margin-left:10px;border:1px solid black;float:left;"/>')
						.append( '<i style="color:grey">' + ast.rule.type + '</i>' + ' <b>' + ast.rule.token + '<font color="red"> ' + ast.match.match[0] + '</font></b>')
						.appendTo( html);
						if( ast.children.length) {
							var children = $('<div style=""/>').appendTo( label);
							for( var i=0; i<ast.children.length; i++) {
								children.append( ast.children[i].html());
							}
						}
						ast = ast.nextSibling;
					}
					
					return html;
				},
				/**
				 * useful to rebuild the whole AST
				 *
				 * condition is expected to return :  
				 * * undefined 		 					-> ast should be completely removed
				 * * ast replacement 					-> another ast node replacing the inspected one
				 * * ast given as argument to condition -> no change
				 *
				 */
				purge : function( /*function*/condition) {
					var children = [];
					for( var i=0; i<this.children.length; i++) {
						var ast = this.children[i].purge( condition);
						!ast || children.push( ast);
					}
					this.children = children;
					
					var ast = condition.call( this, this); 
					if( ast===undefined) {				// remove ast
						if( this.prevSibling) {
							this.prevSibling.nextSibling = this.nextSibling;							
						}
						if( this.nextSibling) {
							this.nextSibling.prevSibling = this.prevSibling;
							return this.nextSibling.purge( condition);
						}
						
						return undefined;
					} else if( ast!==this) {			// replace ast by another ast 		
						if( this.prevSibling) {
							this.prevSibling.nextSibling = ast.getFirstSibling();
							ast.getFirstSibling().prevSibling = this.prevSibling; 
						}
						if( this.nextSibling) {
							this.nextSibling.prevSibling = ast.getLastSibling();
							ast.getLastSibling().nextSibling = this.nextSibling; 
							this.nextSibling.purge( condition);
						}
						
						return ast.getFirstSibling();
					}
					
					this.nextSibling && this.nextSibling.purge( condition);
					
					return this;
				}
			});
			
			return this;
		}
		else return new $.orangevolt.parse.AST( rule, match, /**AST*/prevSibling, /**array<AST>*/children);
	};
	
	$.orangevolt.parse.Rule = function( /**Rule*/prevSibling, /*Token*/token /**, children<Rule>*/) {
		var children = arguments.length>2 ? arguments[ 2] : [];
		
		if( this instanceof $.orangevolt.parse.Rule) {
			$.extend( this, $.orangevolt.parse.Node, {
				prevSibling 	: prevSibling,
				nextSibling 	: undefined,
				token 			: token,
				children 		: (function() {
					for ( var i=0; i<children.length; i++) {
						children[i] = children[i].getFirstSibling();
					}
					return children;
				})(),
				adapt 			: function( parser, /**AST*/prevSibling) {
					throw 'rule : instance function adapt undefined !';
				},
				parse			: function( parser) {
					var rule = this;
					var result = undefined, ast;
					
					try {
						do {
							ast = rule.adapt( parser, ast);
							
							if( ast instanceof $.orangevolt.parse.Error) {
								return ast;
							}
							
							if( !result) {
								result = ast;
							}
						}
						while( rule=rule.nextSibling);
						
						return result;
					} catch( ex) {
						return parser.error({
							msg   : rule.type + '<' + rule.token + '> : ' + ex.toString(),
							rule  : this, 
							match : undefined
						});	
					} finally {
						(ast instanceof $.orangevolt.parse.Error) && result && parser.rollback( result);
					} 
				},
				_childRuleNames : function() {
					var ruleNames = [];
					for( var i=0; i<this.children.length; i++) {
						ruleNames.push( this.children[i].type + '<' + this.children[i].token + '>');
					}
					
					return ruleNames.join( ', ');
				}
			});
			
				// set ourself as next in our previous sibling
			!this.prevSibling || (this.prevSibling.nextSibling=this);  
			
			return this;
		}
		else return new $.orangevolt.parse.Rule( /**Rule*/prevSibling, /*Token*/token, /**, children<Rule>*/children);
	};
	
		// adapt factory methods to $.orangevolt.parse.Rule 
	$( ['Token', 'OneOf', 'OneOrMore', 'ZeroOrMore', 'Once', 'Optional', 'Loop', 'Repeat', 'Term']).each( function() {
		var type = this;
		$.orangevolt.parse[ type] = $.orangevolt.parse.Rule[ type] = function() {
			var args = $.makeArray( arguments);
			
			args.unshift( this instanceof $.orangevolt.parse.Rule ? this : undefined);
			return eval( 'create' + type).apply( this, args);
		};
	});
		// --
	
	/**
	 * static && instance method : creates a Token rule 
	 */
	function createToken(  /**Rule*/prevSibling, /*token*/token /**, token*/) {
		var self = sibling = $.orangevolt.parse.Rule( prevSibling, token);
		self.type = 'Token';
		for( var i=2; i<arguments.length; i++) {
			sibling = createToken( sibling, arguments[i]);
		}
		
		sibling = self;
		do {
			$.extend( sibling, $.orangevolt.parse.Rule, {
				adapt : function( parser, /**AST*/prevSibling) {
					var match = parser.next();
					
					if( this.token==match.token) {
						parser.consume();
						return $.orangevolt.parse.AST( this, match, prevSibling, []);
					} else {
						return parser.error({
							msg : 'Token<' + this.token + '> expected but Token<' + match.token + '> given',
							rule : this, 
							match : match
						});
					}
				}
			});
			sibling = sibling.nextSibling;
		} while( sibling!=null);	
		
		return self;
	}

	/**
	 * 
	 * static && instance method : creates a OneOf rule 
	 */
	function createOneOf(  /**Rule*/prevSibling, /*token*/token, child/*, child1, child2 ...*/) {
		var children = $.makeArray( arguments).splice( 2);
		var self = $.orangevolt.parse.Rule( prevSibling, token, children);
		self.type = 'OneOf';
		
		$.extend( self, $.orangevolt.parse.Rule, {
			adapt : function( parser, /**AST*/prevSibling) {
				var position = parser.position;
				
				var errors = [];
				var ast;
				for( var i=0; i<this.children.length; i++) {
					var rule = this.children[i];
						
					ast = rule.parse( parser);
									
					if( !(ast instanceof $.orangevolt.parse.Error)) { 		// if node chain evaluation was successful
						return $.orangevolt.parse.AST( 
							this, 
							$.orangevolt.parse.Match( '', [''], /*regex*/undefined, this.token, position), 
							prevSibling, 
							[ast]
						);							
					} else {
						errors.push( ast);
					}
				}
				
				if( errors.length) {
					for( var i=0; i<errors.length; i++) {
						errors[i] = (function( error) {
							if( error.child) {
								return arguments.callee( error.child);   
							} else {
								var s = errors[i].rule.type + '<' + errors[i].rule.token + '> ';
								if( errors[i]!==error) {
									s += error.rule.token + ' ...';
								}
								return s;
							}
						})( errors[i]);
					}
				}
				return parser.error({
					msg   : 'OneOf<' + this.token + '> : one of ' + /*this._childRuleNames()*/errors.join( ', ') + ' expected but character "' + parser.next().token + '" found.',
					rule  : this
				});
			}
		});
		return self;
	}
	 
	/**
	 * creates a OneOrMore rule
	 * 
	 * instance && static method : is used for building also rule 
	 * ZeroOrMore
	 *  
	 */
	function createOneOrMore (  /**Rule*/prevSibling, /*token*/token, child) {
		var self = $.orangevolt.parse.Rule( prevSibling, token, [ child]);
		self.type = 'OneOrMore';
		
		$.extend( self, $.orangevolt.parse.Rule, {
			adapt : function( parser, /**AST*/prevSibling) {
				var position = parser.position;
				var childChainLength = this.children[0].getChainLength();		
				var asts = [];
				
				var ast;
				do {
					ast = this.children[0].parse( parser);
									
					if( !(ast instanceof $.orangevolt.parse.Error)) { 		// if node chain evaluation was successful
						asts.push( ast);
						continue;											// try again
					} else { 												// else roll back incomplete parsed node chain					
						parser.rollback( undefined);
					}
					
					break;
				}
				while( true);
				
				if( this.type=='ZeroOrMore' || asts.length) {	// if its a zeroormore rule or it has children
					return $.orangevolt.parse.AST( 
						this, 
						$.orangevolt.parse.Match( '', [''], /*regex*/undefined, this.token, position), 
						prevSibling, 
						asts
					);
				} 
				
				while( asts.length) {
					parser.rollback( asts.pop());
				}
				
				return parser.error({
					msg   : 'OneOrMore<' + this.token + '> : one or more ' + this._childRuleNames() + ' expected.',
					rule  : this,
					child : (ast instanceof $.orangevolt.parse.Error) ? ast : undefined
				});
			}
		});
		
		return self;
	}
	 
	 /**
	 * static && instance method : creates a ZeroOrMore rule by createing a OneOrMore rule and overrriding 
	 * its type (which changes its behaviour to ZeroOrMore, see createZeroOrMore)  
	 */
	function createZeroOrMore(  /**Rule*/prevSibling, /*token*/token, child) {
		 var rule = createOneOrMore( prevSibling, token, child); 
		 rule.type = 'ZeroOrMore';
		 
		 var adapt = rule.adapt;
		 rule.adapt = function( parser, /*AST*/prevSibling) {
			var ast = adapt.call( rule, parser, prevSibling);  
			
			if( (ast instanceof $.orangevolt.parse.Error)) {
				ast.msg = 'ZeroOrMore<' + this.token + '> : ' + this._childRuleNames() + ' zero or more times expected.';
				return ast;
			}
			
			return ast;
		};
		 
		 return rule;
	} 
	 
	 /**
	 * instance && static method : is used for building the concrete rules 
	 * Loop, Once and Optional
	 * 
	 * creates a Repeat, Loop, Once or Optional rule depending on given arguments 
	 */
	function createRepeat( /**Rule*/prevSibling, /*token*/token, minTimes, maxTimes, child) {
		var self = $.orangevolt.parse.Rule( prevSibling, token, [ child]);
		self.type = 'Repeat';	// will be overwritten by concrete rule types
		
		$.extend( self, $.orangevolt.parse.Rule, {
			adapt : function( parser, /**AST*/prevSibling) {
				var position = parser.position;
				
				var childChainLength = this.children[0].getChainLength();		
				var asts = [];
				
				var ast;
				do {
					ast = this.children[0].parse( parser);
									
					if( ast instanceof $.orangevolt.parse.Error) {
						parser.rollback();
						
						for( var i=asts.length-1; i>=0; i--) {
							parser.rollback( asts[i]);
						}
				
						if( minTimes>0) {
							return parser.error({
								msg   : 'Repeat<' + this.token + '> : ' + '(' + minTimes + ',' + maxTimes + ') times ' + this._childRuleNames() + ' expected but matched ' + asts.length + ' times.',
								rule  : this,
								child : (ast instanceof $.orangevolt.parse.Error) ? ast : undefined 
							});
						}
					} else {
						asts.push( ast);
						
						if( asts.length<maxTimes) { // !maxTimes reached ? 
							continue;				// -> try again
						}
					}
										
					break;
				}
				while( true);
				
				return $.orangevolt.parse.AST( 
					this, 
					$.orangevolt.parse.Match( '', [''], /*regex*/undefined, this.token, position), 
					prevSibling, 
					asts
				);
			}
		});
		
		return self;
	} 

	 /**
	 * creates a Once rule 
	 */ 
	function createOnce( /**Rule*/prevSibling, /*token*/token, child) {
		var rule = createRepeat( prevSibling, token, 1, 1, child);
		rule.type = 'Once';
		
		var adapt = rule.adapt;
		rule.adapt = function( parser, /*AST*/prevSibling) {
			var ast = adapt.call( rule, parser, prevSibling);  
			
			if( (ast instanceof $.orangevolt.parse.Error)) {
				ast.msg = 'Once<' + this.token + '> : ' + this._childRuleNames() + ' expected.'; 
				return ast;
			}
			
			return ast;
		};
		
		return rule;
	}
	
	 /**
	 * creates a Optional rule 
	 */ 
	function createOptional( /**Rule*/prevSibling, /*token*/token, child) {
		var rule = createRepeat( prevSibling, token, 0, 1, child);
		rule.type = 'Optional';
	
		var adapt = rule.adapt;
		rule.adapt = function( parser, /*AST*/prevSibling) {
			var ast = adapt.call( rule, parser, prevSibling);  
			
			if( (ast instanceof $.orangevolt.parse.Error)) {
				ast.msg = 'Optional<' + this.token + '> : a optional ' + this._childRuleNames() + ' expected.';
				return ast;
			}
			
			return ast;
		};

		return rule;
	}
	
	 /**
	 * creates a Loop rule 
	 */ 
	function createLoop( /**Rule*/prevSibling, /*token*/token, /*int*/nTimes, child) {
		var rule = createRepeat( prevSibling, token, nTimes, nTimes, child);
		rule.type = 'Loop';

		var adapt = rule.adapt;
		rule.adapt = function( parser, /*AST*/prevSibling) {
			var ast = adapt.call( rule, parser, prevSibling);  
			
			if( (ast instanceof $.orangevolt.parse.Error)) {
				ast.msg = 'Loop<' + this.token + '> : ' + nTimes + ' times ' + this._childRuleNames() + ' expected.';
				return ast;
			}
			
			return ast;
		};
		
		return rule;
	}
	
	/**
	 * creates a term rule. a term is a delegate to a root rule.
	 * 
	 * a term rule is a rule referencing another rule by its name (parameter token).
	 * in other words : term( 'a') will invoke the root rule with token 'a'.
	 * 
	 * a term( 'a') will result exactly in what the rule 'a' returned 
	 */
	function createTerm( /**Rule*/prevSibling, /*token*/token) {
		var self = $.orangevolt.parse.Rule( prevSibling, token, []);
		self.type = 'Term';	
		
		var delegate = undefined;
			
		$.extend( self, $.orangevolt.parse.Rule, {
			adapt : function( parser, /**AST*/prevSibling) {
				var position = parser.position;
			
				if( delegate===undefined) {
					for( var i=0; i<parser.grammar.rules.length; i++) {
						if( parser.grammar.rules[i].token==this.token) {
							delegate = parser.grammar.rules[i];
							break;
						}
					}

					if( !delegate) {
						throw 'term : could not resolve rule "' + this.token + '"';
					}
				}
			
				var ast = delegate.parse( parser, prevSibling);
				
				if( !(ast instanceof  $.orangevolt.parse.Error)) {
					return $.orangevolt.parse.AST( 
						this, 
						$.orangevolt.parse.Match( '', [''], /*regex*/undefined, this.token, position), 
						prevSibling, 
						[ ast ]
					);
				} 
				
				return parser.error({
					msg   : 'Term<' + this.token + '> : ' + delegate.type + '<' + delegate.token + '> expected.',
					rule  : this,
					child : (ast instanceof  $.orangevolt.parse.Error) ? ast : undefined 
				});
			}
		});
		
		return self;
	}
})(jQuery);