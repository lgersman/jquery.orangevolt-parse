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
	$.orangevolt.parse.jse.grammar = $.orangevolt.parse.Grammar({
		lexer : {
			skip   : /((\s*)|(\/{2}.*(\r\n|\r|\n))|(\/\*((\*[^\/])|.)*\*\/))*/, 
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
	 		$.orangevolt.parse.Once( 'expr',
	 				$.orangevolt.parse.Term( 'cond-expr') 	
			),
			$.orangevolt.parse.Once( 'cond-expr',
					$.orangevolt.parse.Term( 'cond-or-expr').Optional( 'cond-or-expr-right',
							$.orangevolt.parse.Token('?').Term( 'expr').Token(':').Term('expr') 
				) 	
			),
			$.orangevolt.parse.Once( 'cond-or-expr',
					$.orangevolt.parse.Term('cond-and-expr').ZeroOrMore( 'cond-and-expr-right',
							$.orangevolt.parse.Token('||').Term('cond-and-expr')
				)
			),
			$.orangevolt.parse.Once( 'cond-and-expr',
					$.orangevolt.parse.Term('incl-or-expr').ZeroOrMore( 'cond-and-expr-right',
							$.orangevolt.parse.Token('&&').Term('incl-or-expr')
				)
			),
			$.orangevolt.parse.Once( 'incl-or-expr',
					$.orangevolt.parse.Term('excl-or-expr').ZeroOrMore( 'incl-or-expr-right',
							$.orangevolt.parse.Token('|').Term('excl-or-expr')
				)
			),
			$.orangevolt.parse.Once( 'excl-or-expr',
					$.orangevolt.parse.Term('and-expr').ZeroOrMore( 'excl-or-expr-right',
							$.orangevolt.parse.Token('^').Term('and-expr')
				)
			),
			$.orangevolt.parse.Once( 'and-expr',
					$.orangevolt.parse.Term('ident-expr').ZeroOrMore( 'and-expr-right',
							$.orangevolt.parse.Token('&').Term('ident-expr')
				)
			),
			$.orangevolt.parse.Once( 'ident-expr',
					$.orangevolt.parse.Term('equ-expr').ZeroOrMore( 'ident-expr-right',
							$.orangevolt.parse.OneOf( 'ident-operator', 
									$.orangevolt.parse.Token('!=='),
									$.orangevolt.parse.Token('===')
					)
					.Term('equ-expr')
				)
			),
			$.orangevolt.parse.Once( 'equ-expr',
					$.orangevolt.parse.Term('instanceof-expr').ZeroOrMore( 'equ-expr-right',
							$.orangevolt.parse.OneOf( 'equ-operator', 
									$.orangevolt.parse.Token('!='),
									$.orangevolt.parse.Token('==')
					)
					.Term('instanceof')
				)
			),
			$.orangevolt.parse.Once( 'instanceof-expr',
					$.orangevolt.parse.Term('rel-expr').Optional( 'instanceof-expr-right',
							$.orangevolt.parse.Token( 'INSTANCEOF').Token( 'IDENTIFIER')
				)
			),
			$.orangevolt.parse.Once( 'rel-expr',
					$.orangevolt.parse.Term('add-expr').ZeroOrMore( 'rel-expr-right',
							$.orangevolt.parse.OneOf( 'rel-operator', 
									$.orangevolt.parse.Token('<'),
									$.orangevolt.parse.Token('>'),
									$.orangevolt.parse.Token('<='),
									$.orangevolt.parse.Token('>=')
					)
					.Term('add-expr')
				)
			),
			$.orangevolt.parse.Once( 'add-expr',
					$.orangevolt.parse.Term('mul-expr').ZeroOrMore( 'add-expr-right',
							$.orangevolt.parse.OneOf( 'add-operator', 
									$.orangevolt.parse.Token('+'),
									$.orangevolt.parse.Token('-')
					)
					.Term('mul-expr')
				)
			),
			$.orangevolt.parse.Once( 'mul-expr',
					$.orangevolt.parse.Term('unary-expr').ZeroOrMore( 'mul-expr-right',
							$.orangevolt.parse.OneOf( 'mul-operator', 
									$.orangevolt.parse.Token('*'),
									$.orangevolt.parse.Token('/'),
									$.orangevolt.parse.Token('%')
					)
					.Term('unary-expr')
				)
			),
			$.orangevolt.parse.OneOf( 'unary-expr',
					$.orangevolt.parse.OneOf( 'unary-operator', 
							$.orangevolt.parse.Token( '+'), $.orangevolt.parse.Token( '-')
				).Term( 'unary-expr'),
				$.orangevolt.parse.Term('pre-inc-expr'),	
				$.orangevolt.parse.Term('pre-dec-expr'),
				$.orangevolt.parse.Term('neg-expr') 	
			),
			$.orangevolt.parse.Once( 'pre-inc-expr',
					$.orangevolt.parse.Token('++').Term( 'prim-expr')
			),
			$.orangevolt.parse.Once( 'pre-dec-expr',
					$.orangevolt.parse.Token('--').Term( 'prim-expr')
			),
			$.orangevolt.parse.OneOf( 'neg-expr',
					$.orangevolt.parse.Token('!').Term( 'unary-expr'),
					$.orangevolt.parse.Term('postfix-expr')	
			),
			$.orangevolt.parse.Once( 'postfix-expr',
					$.orangevolt.parse.Term( 'prim-expr').Optional( 'postfix-expr-right',
							$.orangevolt.parse.OneOf( 'postfix-operator', $.orangevolt.parse.Token( '++'), $.orangevolt.parse.Token( '--'))
				)	
			),
			$.orangevolt.parse.Once( 'prim-expr',
					$.orangevolt.parse.Term( 'prim-prefix').ZeroOrMore( 'prim-expr-right',
							$.orangevolt.parse.Term('prim-suffix')
				)
			),
			$.orangevolt.parse.OneOf( 'prim-prefix',
					$.orangevolt.parse.Term('literal'),
					$.orangevolt.parse.Token('(').Term( 'expr').Token(')'),
					$.orangevolt.parse.Term( 'array'),
					$.orangevolt.parse.Term( 'object')
			),
			$.orangevolt.parse.OneOf( 'prim-suffix',
					$.orangevolt.parse.Term( 'member'),
					$.orangevolt.parse.Term( 'array'),
					$.orangevolt.parse.Term( 'args')
			),
			$.orangevolt.parse.Once( 'member',
					$.orangevolt.parse.Token('.').Token( 'IDENTIFIER')
			),
			$.orangevolt.parse.Once( 'array',
					$.orangevolt.parse.Token('[').Optional( 'params', 
							$.orangevolt.parse.Term('arg-list')
				).Token( ']')
			),
			$.orangevolt.parse.Once( 'object',
					$.orangevolt.parse.Token('{').ZeroOrMore( 'object-expr-right',
							$.orangevolt.parse.Term('object-properties')
				).Token( '}')
			),
			$.orangevolt.parse.Once( 'object-properties',
					$.orangevolt.parse.Term( 'object-property').ZeroOrMore( 'object-properties-right',
							$.orangevolt.parse.Token(',').Term( 'object-property')
				)
			),
			$.orangevolt.parse.Once( 'object-property',
				/*	
				OneOf( 'property',
					Token( 'IDENTIFIER'),
					Token( 'STRING')
				)
				*/
					$.orangevolt.parse.Term( 'literal')	
				.Token( ':')
				.Term( 'expr')
			),
			$.orangevolt.parse.OneOf( 'literal',
					$.orangevolt.parse.Token('NUMBER'),
					$.orangevolt.parse.Token('STRING'),
					$.orangevolt.parse.Token('IDENTIFIER')
			),
			$.orangevolt.parse.Once( 'args',
					$.orangevolt.parse.Token('(').Optional( 'params', 
							$.orangevolt.parse.Term('arg-list')
				).Token( ')')
			),
			$.orangevolt.parse.Once( 'arg-list',
					$.orangevolt.parse.Term( 'expr').ZeroOrMore( 'arg-list-right',
							$.orangevolt.parse.Token(',').Term( 'expr')
				)
			)
	 	]
	}); 
	
	/**
	 * purge function usable as argument for function $.orangevolt.parse.AST.purge( ...)
	 * to compact the AST tree generated by the javascript expression grammar
	 */
	$.orangevolt.parse.jse.purge = function( ast, condition) {
		/*
		if( $.inArray( ast.rule.token, [ '(', ')', '{', '}', '[', ']', ':', ','])!=-1) {
			return undefined;
		} 
		*/
		
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