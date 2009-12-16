/* 
 * Copyright (c) 2009 Lars Gersmann (lars.gersmann@gmail.com, http://orangevolt.blogspot.com)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 */

/**
 * jse = Javascript Expression
 * 
 * $.orangevolt.parse.jse contains a jquery.orangevolt-parse grammar for Javascript expressions.
 * 
 * $.orangevolt.parse.jse properties :
 * grammar : jquery.orangevolt-parse javascript expression grammar
 * purge   : purge function for minifying the AST via $.orangevolt.parse.AST.purge  
 */ 
;(jQuery.orangevolt && jQuery.orangevolt.parse && jQuery.orangevolt.parse.jse) || (function($) {
		
		// if orangevolt.parse is undefined abort (the jquery.orangevolt.parse plugin is a prerequisite) 
	if( !$.orangevolt.parse) {		
		return;
	}

	$.orangevolt.parse.jse = { };
	
	/**
	 * javascript expression grammar
	 */ 
	with( $.orangevolt.parse) {
		$.orangevolt.parse.jse.grammar = Grammar({
			lexer : {
				skip   : /((\s*)|(\/{2}.*$)|(\/\*((\*[^\/])|.)*\*\/))*/, 
				tokens : {
					IDENTIFIER  : /[a-zA-Z_]\w*/,	
					NUMBER      : /\d+(\.\d+)?/,	
					'||'		: /\|\|/,
					'|'			: /\|/,
					'&&'		: /\&\&/,
					'&'			: /\&/,
					'==='		: /===/,
					'!=='		: /!==/,
					'=='		: /==/,
					'!='		: /!=/,
					'++'       	: /\+\+/,
					'--' 	    : /\-\-/,
					'+'        	: /\+/,
					'-' 	    : /\-/,
					'*'	    	: /\*/,
					'/'     	: /\//,
					'>='       	: /\>=/,
					'<=' 	    : /\<=/,
					'>'	    	: /\>/,
					'<'     	: /\</,
					'%'     	: /\%/,
					':'     	: /\:/,
					'.'     	: /\./,
					'='     	: /\=/,
					'?'     	: /\?/,
					'('		  	: /\(/,
					')'			: /\)/,
					','			: /\,/,						
					'INSTANCEOF': /instanceof/,
					STRING		: /('((\\')|[^'])*')|("((\\")|[^"])*")/,
					'['			: /\[/,
					']'			: /\]/,
					'{'			: /\{/,
					'}'			: /\}/						
				}
			},
		 	rules : [
		 		Once( 'expr',
				 	Term( 'cond-expr') 	
				),
				Once( 'cond-expr',
				 	Term( 'cond-or-expr').Optional( 'cond-or-expr-right',
						Token('?').Term( 'expr').Token(':').Term('expr') 
					) 	
				),
				Once( 'cond-or-expr',
					Term('cond-and-expr').ZeroOrMore( 'cond-and-expr-right',
						Token('||').Term('cond-and-expr')
					)
				),
				Once( 'cond-and-expr',
					Term('incl-or-expr').ZeroOrMore( 'cond-and-expr-right',
						Token('&&').Term('incl-or-expr')
					)
				),
				Once( 'incl-or-expr',
					Term('excl-or-expr').ZeroOrMore( 'incl-or-expr-right',
						Token('|').Term('excl-or-expr')
					)
				),
				Once( 'excl-or-expr',
					Term('and-expr').ZeroOrMore( 'excl-or-expr-right',
						Token('^').Term('and-expr')
					)
				),
				Once( 'and-expr',
					Term('ident-expr').ZeroOrMore( 'and-expr-right',
						Token('&').Term('ident-expr')
					)
				),
				Once( 'ident-expr',
					Term('equ-expr').ZeroOrMore( 'ident-expr-right',
						OneOf( 'ident-operator', 
							Token('!=='),
							Token('===')
						)
						.Term('equ-expr')
					)
				),
				Once( 'equ-expr',
					Term('instanceof-expr').ZeroOrMore( 'equ-expr-right',
						OneOf( 'equ-operator', 
							Token('!='),
							Token('==')
						)
						.Term('instanceof')
					)
				),
				Once( 'instanceof-expr',
					Term('rel-expr').Optional( 'instanceof-expr-right',
						Token( 'INSTANCEOF').Token( 'IDENTIFIER')
					)
				),
				Once( 'rel-expr',
					Term('add-expr').ZeroOrMore( 'rel-expr-right',
						OneOf( 'rel-operator', 
							Token('<'),
							Token('>'),
							Token('<='),
							Token('>=')
						)
						.Term('add-expr')
					)
				),
				Once( 'add-expr',
					Term('mul-expr').ZeroOrMore( 'add-expr-right',
						OneOf( 'add-operator', 
							Token('+'),
							Token('-')
						)
						.Term('mul-expr')
					)
				),
				Once( 'mul-expr',
					Term('unary-expr').ZeroOrMore( 'mul-expr-right',
						OneOf( 'mul-operator', 
							Token('*'),
							Token('/'),
							Token('%')
						)
						.Term('unary-expr')
					)
				),
				OneOf( 'unary-expr',
					OneOf( 'unary-operator', 
						Token( '+'), Token( '-')
					).Term( 'unary-expr'),
					Term('pre-inc-expr'),	
					Term('pre-dec-expr'),
					Term('neg-expr') 	
				),
				Once( 'pre-inc-expr',
					Token('++').Term( 'prim-expr')
				),
				Once( 'pre-dec-expr',
					Token('--').Term( 'prim-expr')
				),
				OneOf( 'neg-expr',
					Token('!').Term( 'unary-expr'),
					Term('postfix-expr')	
				),
				Once( 'postfix-expr',
					Term( 'prim-expr').Optional( 'postfix-expr-right',
						OneOf( 'postfix-operator', Token( '++'), Token( '--'))
					)	
				),
				Once( 'prim-expr',
					Term( 'prim-prefix').ZeroOrMore( 'prim-expr-right',
						Term('prim-suffix')
					)
				),
				OneOf( 'prim-prefix',
					Term('literal'),
					Token('(').Term( 'expr').Token(')'),
					Term( 'array'),
					Term( 'object')
				),
				OneOf( 'prim-suffix',
					Term( 'member'),
					Term( 'array'),
					Term( 'args')
				),
				Once( 'member',
					Token('.').Token( 'IDENTIFIER')
				),
				Once( 'array',
					Token('[').Optional( 'params', 
						Term('arg-list')
					).Token( ']')
				),
				Once( 'object',
					Token('{').ZeroOrMore( 'object-expr-right',
						Term('object-properties')
					).Token( '}')
				),
				Once( 'object-properties',
					Term( 'object-property').ZeroOrMore( 'object-properties-right',
						Token(',').Term( 'object-property')
					)
				),
				Once( 'object-property',
					OneOf( 'property',
						Token( 'IDENTIFIER'),
						Token( 'STRING')
					)
					.Token( ':')
					.Term( 'expr')
				),
				OneOf( 'literal',
					Token('NUMBER'),
					Token('STRING'),
					Token('IDENTIFIER')
				),
				Once( 'args',
					Token('(').Optional( 'params', 
						Term('arg-list')
					).Token( ')')
				),
				Once( 'arg-list',
					Term( 'expr').ZeroOrMore( 'arg-list-right',
						Token(',').Term( 'expr')
					)
				)
		 	]
		}); 
	}
	
	/**
	 * purge function usable as argument for function $.orangevolt.parse.AST.purge( ...)
	 * to compact the AST tree generated by the javascript expression grammar
	 */
	$.orangevolt.parse.jse.purge = function( ast, condition) {
		if( $.inArray( ast.rule.token, [ '(', ')', '{', '}', '[', ']', ':', ','])!=-1) {
			return undefined;
		} 

		if( ast.rule.type=='Optional' && !ast.children.length) {
			return undefined;
		}

		if( ast.rule.type=='ZeroOrMore' && !ast.children.length) {
			return undefined;
		}

		if( ast.rule.type=='OneOf') {
			return ast.children[0];
		}

		if( ast.rule.type=='Once' && $.inArray( ast.rule.token, ['object', 'array', 'args'])==-1) {
			return ast.children[0];
		}
	
		return this;
	};
})(jQuery);