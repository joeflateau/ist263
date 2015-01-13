$.fn.poll = function(options){
	return this.each(function(){
	        var $poll = $(this),
	            id = $(this).prop("id"),
	            $graph = $poll.find("svg"),
	            graph = nv.models.discreteBarChart()
	              .showValues(true)
	              .x(function(d){ return d.key; })
	              .y(function(d){ return d.value; }),
	            $options = $poll.find("ul > li");

	        socket.on('vote:' + id, function(votes){
	            d3.select($graph[0])
	                .datum([{
	                  key:"",
	                  values:votes
	                    }])
	                .call(graph);
	          });

	        $options.on('click', function(){
	            socket.emit('vote', {id:id,index:$(this).index()});
	          });
	        
	      });
}