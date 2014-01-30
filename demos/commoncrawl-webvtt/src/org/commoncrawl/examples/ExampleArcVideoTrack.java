package org.commoncrawl.examples;

// Java classes
import java.lang.IllegalArgumentException;
import java.lang.Integer;
import java.lang.Math;
import java.lang.OutOfMemoryError;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.util.Arrays;



// log4j classes
import org.apache.log4j.Logger;

// Hadoop classes
import org.apache.hadoop.conf.Configured;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FSDataOutputStream;
import org.apache.hadoop.fs.FileStatus;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.fs.PathFilter;
import org.apache.hadoop.io.LongWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapred.FileInputFormat;
import org.apache.hadoop.mapred.FileOutputFormat;
import org.apache.hadoop.mapred.InputSplit;
import org.apache.hadoop.mapred.JobClient;
import org.apache.hadoop.mapred.JobConf;
import org.apache.hadoop.mapred.Mapper;
import org.apache.hadoop.mapred.MapReduceBase;
import org.apache.hadoop.mapred.OutputCollector;
import org.apache.hadoop.mapred.Reporter;
import org.apache.hadoop.mapred.TextOutputFormat;
import org.apache.hadoop.mapred.lib.LongSumReducer;
import org.apache.hadoop.util.Progressable;
import org.apache.hadoop.util.Tool;
import org.apache.hadoop.util.ToolRunner;
// Common Crawl classes
import org.commoncrawl.hadoop.mapred.ArcInputFormat;
import org.commoncrawl.hadoop.mapred.ArcRecord;

// jsoup classes
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import com.google.common.net.InternetDomainName;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

/**
 * Analyzing the Common Crawl corpus for the existence of &lt;track&gt; elements 
 * and &lt;track kind="metadata"&gt; elements
 * 
 * @author Thomas Steiner <tomac@google.com>
 */
public class ExampleArcVideoTrack
    extends    Configured
    implements Tool {

  private static final Logger LOG = Logger.getLogger(ExampleArcVideoTrack.class);

  /**
   * Checks incoming Web documents for the existence of &lt;track&gt; elements
   * Skips any non-HTML pages.
   *
   * @author Thomas Steiner <tomac@google.com>
   * 
   * Adapted from ExampleArcMicroformat.java
   */
  public static class ExampleArcVideoTrackMapper
      extends    MapReduceBase
      implements Mapper<Text, ArcRecord, Text, LongWritable> {
 
    // create a counter group for Mapper-specific statistics
    private final String _counterGroup = "Custom Mapper Counters";

    public void map(Text key, ArcRecord value, OutputCollector<Text, LongWritable> output, Reporter reporter)
        throws IOException {

      try {

        // key & value are "Text" right now ...
        String url   = key.toString();
        String json  = value.toString();        
        
        if (!value.getContentType().contains("html")) {
          reporter.incrCounter(this._counterGroup, "Skipped - Not HTML", 1);
          return;
        }

        // just curious how many of each content type we've seen
        reporter.incrCounter(this._counterGroup, "Content Type - "+value.getContentType(), 1);

        // ensure sample instances have enough memory to parse HTML
        if (value.getContentLength() > (5 * 1024 * 1024)) {
          reporter.incrCounter(this._counterGroup, "Skipped - HTML Too Long", 1);
          return;
        }
        
        Document doc = value.getParsedHTML();

        if (doc == null) {
          reporter.incrCounter(this._counterGroup, "Skipped - Unable to Parse HTML", 1);
          return;
        }

        Elements videos = doc.select("video");
        if (videos.size() > 0) {  
          
          // Get the base domain name
          URI uri = new URI(url);
          String host = uri.getHost();

          if (host == null) {
            reporter.incrCounter(this._counterGroup, "Invalid URI", 1);
            return;
          }

          InternetDomainName domainObj = InternetDomainName.from(host);
          String domain = domainObj.topPrivateDomain().name();
          if (domain == null) {
            reporter.incrCounter(this._counterGroup, "Invalid Domain", 1);
            return;
          }
          // See if the page has a successful HTTP code
          JsonParser jsonParser = new JsonParser();
          JsonObject jsonObj    = jsonParser.parse(json).getAsJsonObject();
          if (jsonObj.has("http_result") == false) {
            reporter.incrCounter(this._counterGroup, "HTTP Code Missing", 1);
            return;
          }
          if (jsonObj.get("http_result").getAsInt() == 200) {
            reporter.incrCounter(this._counterGroup, "HTTP Success", 1);
            // only output counts for pages that were successfully retrieved
            for (Element video : videos) {
              // <video src="">
              String videoSrc = video.hasAttr("src") ? video.attr("src") : "";
              String sourceSrc = "";
              String trackKind = "";
              String trackSrc = "";
              
              // <source src="">
              Elements sources = video.select("source");
              if (sources.size() > 0) {              
                for (Element source : sources) {                
                  sourceSrc += source.hasAttr("src") ? " ### " + source.attr("src") : "";
                }
              }           
              
              // <track src="" kind="">
              Elements tracks = video.select("track");
              if (tracks.size() > 0) {
                for (Element track : tracks) {
                  trackKind = track.hasAttr("kind") ? " ### " + track.attr("kind") : "";
                  trackSrc = track.hasAttr("src") ? " ### " + track.attr("src") : "";
                }
              }
              output.collect(new Text(
                  domain + "\t" +
                  url + "\t" +
                  videoSrc + "\t" +
                  sourceSrc + "\t" +
                  trackKind + "\t" +
                  trackSrc), new LongWritable(1));
            }            
          }
          else {
            reporter.incrCounter(this._counterGroup, "HTTP Not Success", 1);
          } 
        }     
      }
      catch (Throwable e) {

        // Occasionally Jsoup parser runs out of memory ...
        if (e.getClass().equals(OutOfMemoryError.class))
          System.gc();

        LOG.error("Caught Exception", e);
        reporter.incrCounter(this._counterGroup, "Skipped - Exception Thrown", 1);
      }
    }
  }

  /**
   * Hadoop FileSystem PathFilter for ARC files, allowing users to limit the
   * number of files processed.
   *
   * @author Chris Stephens <chris@commoncrawl.org>
   */
  public static class SampleFilter
      implements PathFilter {

    private static int count =         0;
    private static int max   = 999999999;    

    public boolean accept(Path path) {

      if (!path.getName().endsWith(".arc.gz"))
        return false;

      SampleFilter.count++;

      if (SampleFilter.count > SampleFilter.max)
        return false;

      return true;
    }
  }

  /**
   * Implementation of Tool.run() method, which builds and runs the Hadoop job.
   *
   * @param  args command line parameters, less common Hadoop job parameters stripped
   *              out and interpreted by the Tool class.  
   * @return      0 if the Hadoop job completes successfully, 1 if not. 
   */
  @Override
  public int run(String[] args)
      throws Exception {

    String outputPath = null;
    String configFile = null;

    // Read the command line arguments.
    if (args.length <  1)
      throw new IllegalArgumentException("Example JAR must be passed an output path.");

    outputPath = args[0];

    if (args.length >= 2)
      configFile = args[1];
    // Read in any additional config parameters.
    if (configFile != null) {
      LOG.info("adding config parameters from '"+ configFile + "'");
      this.getConf().addResource(configFile);
    }
    
    // Creates a new job configuration for this Hadoop job.
    JobConf job = new JobConf(this.getConf());
    job.setJarByClass(ExampleArcVideoTrack.class);

    String segmentListFile = "s3n://aws-publicdatasets/common-crawl/parse-output/valid_segments.txt";
    FileSystem fs = FileSystem.get(new URI(segmentListFile), job);
    BufferedReader reader = new BufferedReader(new InputStreamReader(fs.open(new Path(segmentListFile))));
    String segmentId;
    while ((segmentId = reader.readLine()) != null) {
      String inputPath = "s3n://aws-publicdatasets/common-crawl/parse-output/segment/"+segmentId+"/*.arc.gz";
      // Scan the provided input path for ARC files.
      LOG.info("setting input path to '"+ inputPath + "'");      
      FileInputFormat.addInputPath(job, new Path(inputPath));
      FileInputFormat.setInputPathFilter(job, SampleFilter.class);
    }    
     
    // Delete the output path directory if it already exists.
    LOG.info("clearing the output path at '" + outputPath + "'");

    fs = FileSystem.get(new URI(outputPath), job);

    if (fs.exists(new Path(outputPath)))
      fs.delete(new Path(outputPath), true);

    // Set the path where final output 'part' files will be saved.
    LOG.info("setting output path to '" + outputPath + "'");
    FileOutputFormat.setOutputPath(job, new Path(outputPath));
    FileOutputFormat.setCompressOutput(job, false);

    // Set which InputFormat class to use.
    job.setInputFormat(ArcInputFormat.class);

    // Set which OutputFormat class to use.
    job.setOutputFormat(TextOutputFormat.class);

    // Set the output data types.
    job.setOutputKeyClass(Text.class);
    job.setOutputValueClass(LongWritable.class);

    // Set which Mapper and Reducer classes to use.
    job.setMapperClass(ExampleArcVideoTrack.ExampleArcVideoTrackMapper.class);
    job.setReducerClass(LongSumReducer.class);

    if (JobClient.runJob(job).isSuccessful())
      return 0;
    else
      return 1;   
  }

  /**
   * Main entry point that uses the {@link ToolRunner} class to run the example
   * Hadoop job.
   */
  public static void main(String[] args)
      throws Exception {
    int res = ToolRunner.run(new Configuration(), new ExampleArcVideoTrack(), args);
    System.exit(res);
  }
}
